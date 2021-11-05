const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: [1, 'Ratings must be above 1'],
      max: [5, 'Ratings must be below 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      rewuired: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { irtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: null,
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  /* The static methods should be called on the model itself 
  but here we cant get access to the model because we are 
  trying to use even before it has been defined but we might 
  think putting this code below creating the model would be 
  an solution but it wouldn't because the declaration of the 
  code matters here, if we put this code code below the model 
  creation then the model will be created based on the 
  reviewSchema but that reviewSchema would not have this 
  middleware defined on it, this will basically look like 
  defining a middleware after creating the model itself based 
  on the schema. The middlewares need to be declared on the 
  schemas even before the model based on the schema is 
  defined. Here middleware is the one which gives the problem 
  and not calling the method on Review model. */
  this.constructor.calcAverageRatings(this.tour);
  // next();
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  /* findByIdAndUpdate and findByIdAndDelete uses the 
  findOneAndUpdate and findOneAndDelete behind the scenes. */

  // sending the pre middleware data to the post middleware.
  this.r = await this.findOne();
  // This will return the current document that is being processed.

  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne() does not work here because query has already finished
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
