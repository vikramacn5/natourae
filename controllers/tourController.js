const multer = require('multer');
const sharp = require('sharp');

const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

/* Use this when there is a mix of fields in the upload */
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 }, // maxCount: 1 means only one field with this name is allowed in the input
  { name: 'images', maxCount: 3 }, // maxCount: 3 means only three fields with this name is allowed in the input
]);

/* Use this when we are uploading only one field which has 
multiple files */
// upload.array('images', 5) // (fieldName, maxCount)

/* Use this when there is only one field and only one file to 
upload */
// upload.single('image')

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  /* in case of multiple files we use req.files. 
  upload.single puts the file into req.file but upload.array 
  and upload.fields puts the files into req.files */

  if (!req.files.imageCover || !req.files.images) return next();

  // 1. Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2. Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,difficulty,ratingsAverage,summary';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        // _id: null,
        // _id: '$ratingsAverage',
        // _id: '$difficulty',
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 }, // adds one to this counter
        // whenever a document flows through this pipepline
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } } /* We can use stages
    //   multipple times and _id here is the difficulty since
    //   we specified in the previous stages and that becomes
    //   our kind of document now and the fields that we had
    //   in ouroriginal documents won't work now. */,
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },

    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    length: plan.length,
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  // tours-within/:distance/center/:latlng/unit/:unit
  // tours-within/233/center/34.111745,-118.113491/unit/mi
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }
  // console.log(distance, lat, lng, unit);

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  /* geoWithin is a geospatial operator used to perform 
  geospatial operations which is similar to math operaor 
  used to perform math operations. goeWithin actually does 
  what is says finds the tour document within a geometry and 
  the next step is actually we need to specify the geometry 
  so that t can query within that geometry. Here the 
  geometry that we have chosen is centerSphere which is 
  again an operator so it takes its own object, now we need 
  to pass in the required information to the geoWithin 
  operator so the format of the input will be the geometry 
  first and then e need to specify the corordinates and the 
  distance since it is an centerSphere geometry. Here since 
  geoJSON takes co-ordinates in a longitude first and then 
  latitude format, that is how we need to specify. */

  /* Another important thing is before doing the geospatial 
  queries we need to attribute index to the field where the 
  geospatial data that we are searching for is stored or the 
  field with which we are searching the data and that field 
  should be geoJSON type */
  res.status(200).json({
    staus: 'success',
    result: tours.length,
    data: {
      data: tours,
    },
  });
});

/* This aggregator puts the distance field on each and every tour documents and returns all the tour documents as 
the result of this aggregator. */
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        /* geoNear is the only geospatial aggregation 
        pipeline stage that is available and it needs to be 
        the first stage on the pipeline and it also needs 
        atleast one of our field to be indexed with 
        geosaptial index. If there is only one field with 
        geospatial index then this geoNear stage will use 
        that index automatically which is the 2d sphere for 
        startLocation field in order to perform the
        calculations, but if we had multiple fields with 
        geospatial inded then we need to use keys parameter 
        in order to specify the field with which we want to 
        do the clculations. There are two mandatory fields 
        in this geoNear stage they are near and 
        distanceField. */
        near: {
          /* near is the point from which to calculate 
          distances, so all the distances will be calculated 
          from this point that we define here to all the 
          startLocation. near is the property that takes in 
          the point from which the distance is measured and 
          we need to specify this point as geoJSON (that is 
          with type and co-ordinates) */
          type: 'Point',
          coordinates: [+lng, +lat],
        },
        distanceField: 'distance',
        /* This is the name of the field that will be created 
        and where all the calculated distances will be 
        stored */
        distanceMultiplier: multiplier,
        /* Here in distance multiplier we can secify a 
        number which will be multiplied with all the 
        distances */
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});

// ======================================================= //
// ---------- Handlers before factory functions ---------- //
// ======================================================= //

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // EXECUTE QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   // SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

// exports.getTour = catchAsync(async (req, res, next) => {
//   // const tour = Tour.find({_id: req.params.id});
//   // const tour = Tour.findOne({_id: req.params.id});
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

// ------------------------------------------------------- //

// ======================================================= //
// ----------- Handlers for data from JSON file ---------- //
// ======================================================= //

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkID = (req, res, next, val) => {
//   console.log(`Tour id is ${val}`);
//   if (val >= tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid ID',
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       // bad request
//       status: 'fail',
//       message: 'Missing name or price',
//     });
//   }
//   next();
// };

// exports.getAllTours = (req, res) => {
//   console.log(req.requestTime);
//   res.status(200).json({
//     // Ok
//     status: 'success',
//     requestedAt: req.requestTime,
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// };

// exports.createTour = (req, res) => {
//   // console.log(req.body);
//   const newId = tours[tours.length - 1].id + 1;
//   const newTour = { id: newId, ...req.body };
//   // we dont wnt to mutate the original body object

//   tours.push(newTour);

//   fs.writeFile(
//     `${__dirname}/../dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     (err) => {
//       if (err) console.log(err);
//       res.status(201).json({
//         // Created
//         status: 'Success',
//         data: {
//           tour: newTour,
//         },
//       });
//     }
//   );
// };

// exports.getTour = (req, res) => {
//   /* we could also use optional parameters using
//       /api/v1/tours/:id/:x/:y?. Now y here is optional parameter
//       we could make a request even without the y parameter here
//       and this would direct us to this(/api/v1/tours/:id/:x/:y?)
//       route only */

//   const id = +req.params.id;

//   // if(id > tours.length){
//   //   return res.status(404).json({
//   //     status: 'fail',
//   //     message: 'Invalid ID',
//   //   });
//   // }

//   const tour = tours.find((el) => el.id === id);

//   // if (!tour) {
//   //   return res.status(404).json({
//   //     // Not found
//   //     status: 'fail',
//   //     message: 'Invalid ID',
//   //   });
//   // }

//   res.status(200).json({
//     // Ok
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// };

// exports.updateTour = (req, res) => {
//   const id = +req.params.id;
//   // tours[id] = tour;
//   const tour = tours.find((el) => el.id === id);

//   // if (!tour) {
//   //   return res.status(404).json({
//   //     //Not found
//   //     status: 'fail',
//   //     message: 'Invalid ID',
//   //   });
//   // }

//   for (const [key, value] of Object.entries(req.body)) {
//     tour[key] = value;
//   }

//   fs.writeFile(
//     `${__dirname}/../dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     (err) => {
//       if (err) console.log(err);
//       res.status(200).json({
//         // Ok
//         status: 'success',
//         data: {
//           tour,
//         },
//       });
//     }
//   );
// };

// exports.deleteTour = (req, res) => {
//   const id = +req.params.id;

//   // if (id > tours.length) {
//   //   return res.status(404).json({
//   //     // Not found
//   //     status: 'fail',
//   //     message: 'Invalid ID',
//   //   });
//   // }

//   const tourIdx = tours.findIndex((el) => el.id === id);
//   tours.splice(tourIdx, 1);

//   fs.writeFile(
//     `${__dirname}/../dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     (err) => {
//       if (err) console.log(err);
//       res.status(204).json({
//         // No content
//         status: 'success',
//         data: null,
//       });
//     }
//   );
// };

// ------------------------------------------------------- //
