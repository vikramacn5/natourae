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

/* By default we get an index for the id and this id index 
is an ordered list of all the id's stored somewhere outside 
of the collection. So whenever we query for documents by ID 
it does not have to search the whole collection by going one 
by one on all hte documents, it just searches this ordered 
list which is very efficient. So we can actually set indxes 
for some fields on our own of we are querying for that field 
a lot. The ID's should always have to unique because the 
index of ID has a unique property, which is a property tha 
twe can give to our fields. As per our schema definition 
above we will also have an index for the name field 
automatically why because we have defined the name field as 
unique and because of that what mongo does behind the scenes 
in order to ensure the uniqueness of the field is to create 
a unique index for it and so because of that not only the id 
but name should also have to be unque. when we create an 
index for a single field, it is called as ingle field index, 
this is used when we query a lot for that particular field 
but if we query more often for a field along with another 
field then using a compound field makes more sense. When we 
use compound index we don't have to create indexes 
individually for each of the field that were used in 
compound index as the indexing would work individualy too 
when using compound index. Indexing should not be done on all 
the fields we need to carefully study the data access 
patterns in our application in order to figure out which 
field is being queried the most and then as per that we need 
to set the indexes. Setting up indexes actually takes up 
memory and every time we update a document in that 
collection then it also updates the index, so we need to be 
sure while indexing a field, of a collection is written onto 
more that querying then it clearly out weighs the benefit of 
creating the index and actually keeping it on the memory 
because it needs to be updated each and every time when we 
update a document form that collection. So in summary when 
indexing we need to balance the frequency of query made with 
that field and the cost of indexing that field and also the 
write/read ratio of that collection. */

// tourSchema.index({ price: 1 }); // this is called single field index
tourSchema.index({ price: 1, ratingsAverage: -1 }); // compound index
tourSchema.index({ slug: 1 });

/* '2dsphere' if the data describes a real point on a earth 
like sphere or we can use '2d' if the data describes some 
fictional points on the 2dimensional plane. Also we know that 
these index are ordered list stored outside of the collection 
and this list will be in ascending order if the index is 1 
and it will be ordered in descending order if the index is -1 
but now we want the index for startLocation field to be 
ordere as per 2d sphere (earth like structure) that is why 
the index for this is 2d sphere. */
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
