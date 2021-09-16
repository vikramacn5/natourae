const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // validator
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'], // works only for string types
      minlength: [10, 'A tour name must have more or equal than 10 characters'], // works only for string types
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have difficulty'],
      enum: {
        // works only for strings types
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'], // works for dates also
      max: [5, 'Rating must be below 5.0'], // works for dates also
      set: (val) => Math.round(val * 10) / 10, // This runs everytime there comes a value for this field
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(), // This gets converted to today's data in mongoDB
      select: false, // This will exclude this field from the output (useful if it is a sensitive data)
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      /* GeoJSON data type, mongoDB needs atleast 2 fields 
      (type and coordinates) in order to find that it is a 
      GeoJSON (gespatial) data. This is just an object not a 
      schema type options and the same time this also not a 
      document, in order to embed documents inside other 
      documents we need to specify these objects inside of 
      an array */
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      description: String,
      address: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array, // for Embeding the user into tour
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

/* '2dsphere' if the data describes a real point on a earth 
like sphere or we can use '2d' if the data describes some 
fictional points on the 2dimensional plane */
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
/* 
 We cant query using this virtual properties since they are
 not part of the database itself, These virtual properties 
 are set each time we get some data from the database. These 
 are used to keep the archetecture seperated. havinng a need 
 of getting the duration in week is actually a business logic, 
 this doesn't have anything to do with the controller(request
 or response). So we need to keep this logic in the model 
 where it actually belongs 
*/

// DOCUMENT MIDDLEWARE: runs before save() and create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromise = this.guides.map(
//     async (userId) => await User.findById(userId)
//   );
//   this.guides = await Promise.all(guidesPromise);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc); // doc is the document that got saved to the database
//   next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// tourSchema.post(/^find/, function (doc, next) {
//   console.log(`Query took ${Date.now() - this.start} milliseconds!`);
//   // console.log(doc); // gives all the returned documents (we get access to those documents since the query is already executed).
//   next();
// });

// AGGREGATE MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   // console.log(this.pipeline());
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
