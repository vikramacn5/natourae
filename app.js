const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp'); // http parameter pollution
const cookieParser = require('cookie-parser');
const csp = require('express-csp');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

// Start express app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
/* We might get a path from somewhere already with a slash 
in it, so in oreder to avoid this kind of bugs it's better 
to use the path.join() function. */

// ======================================================= //
// ------------------ GLOBAL MIDDLEWARES ----------------- //
// ======================================================= //

// ----------------- Serving static files ---------------- //

app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------- //

// --------------- Set security HTTP headers ------------- //

app.use(helmet()); // running helmet returns the middleware function
csp.extend(app, {
  policy: {
    directives: {
      'default-src': ['self'],
      'style-src': ['self', 'unsafe-inline', 'https:'],
      'font-src': ['self', 'https://fonts.gstatic.com'],
      'script-src': [
        'self',
        'unsafe-inline',
        'data',
        'blob',
        'https://js.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:8828',
        'ws://localhost:56558/',
      ],
      'worker-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://localhost:*/',
      ],
      'frame-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://localhost:*/',
      ],
      'img-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://localhost:*/',
      ],
      'connect-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'wss://<HEROKU-SUBDOMAIN>.herokuapp.com:<PORT>/',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://localhost:*/',
      ],
    },
  },
});

// ------------------------------------------------------- //

// ----------------- Development logging ----------------- //

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ------------------------------------------------------- //

// -------------- Limit request from same IP ------------- //

const limiter = rateLimit({
  // This saves us from brute force and denial service attacks
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter); /* we could've just like that 
specified only the limiter but we need to limit the access to 
our api route, so this works for all the urls that starts 
with /api */

// ------------------------------------------------------- //

// -- Body parser, reading data from body into req.body -- //

app.use(express.json({ limit: '10kb' })); // limiting the amount of incomming data

// ------------------------------------------------------- //

// --------------------- URL encoded --------------------- //

// parses the data from the form and puts into the req.body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ------------------------------------------------------- //

// -------------------- Cookie Parser -------------------- //

app.use(cookieParser());

// ------------------------------------------------------- //

// ------ Data sanitization (NoSQL query injection) ------ //

/* This basically reads all the req.params, req.body, 
req.query and removes all the "$" and "." because using that 
only mongoDB operators are written and removing that would 
make these query injection attacks not to work */
app.use(mongoSanitize());

// ------------------------------------------------------- //

// --- Data sanitization (XSS - cross site scripting) ---- //

/* This removes all the html symbols form the user input data 
mongoose validation itself already gives us a very good 
protection against xss by adding proper validation to the 
schema */
app.use(xss());

// ------------------------------------------------------- //

// ------------ Preventing parameter pollution ----------- //

app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingQuantity',
      'ratingAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// ------------------------------------------------------- //

// ------------------- Test middleware ------------------- //

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  // console.log(req.cookies);
  next();
});

// ------------------------------------------------------- //

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋🏻');
//   next();
// });

// ------------------------------------------------------- //

// app.get('/', (req, res) => {
//   res
//     .status(200)
//     .json({ message: 'Hello from the server side!', app: 'natours' });
// });

// app.post('/', (req, res) => {
//   res.send('You can post to this endpoint...');
// });

// app.get('/api/v1/tours', getAllTour);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// ======================================================= //
// ------------------------ ROUTES ----------------------- //
// ======================================================= //

/*
  app.route('/api/v1/tours').get(getAllTour).post(createTour);
  app.route('api/v1/tours/:id').get(getTour).patch(updateTour).delete(deleteTour);

  app.route('/api/v1/users').get(getAllUser).post(createUser);
  app.route('/api/v1/users/:id').get(getUser).patch(updateUser).delete(deleteUser);
*/

// ------ Declaring the routers ------ //

// const tourRouter = express.Router();
// const userRouter = express.Router();

// ---------------------------- //

// -------- Routing (tours) ---------- //

// tourRouter.route('/').get(getAllTours).post(createTour);

// tourRouter.route('/:id').get(getTour).patch(updateTour).delete(deleteTour);

// -------- Routing (users) ---------- //

// userRouter.route('/').get(getAllUsers).post(createUser);

// userRouter.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

// ---------------------------- //

// -------- Mounting the routers ------- //

/*

link: http://expressjs.com/en/5x/api.html#router

A router object is an isolated instance of middleware and 
routes. You can think of it as a “mini-application,” capable 
only of performing middleware and routing functions. Every 
Express application has a built-in app router.

A router behaves like middleware itself, so you can use it as 
an argument to app.use() or as the argument to another 
router’s use() method.

The top-level express object has a Router() method that 
creates a new router object. Once you’ve created a router 
object, you can add middleware and HTTP method routes (such 
as get, put, post, and so on) to it just like an application. 
For example: 

// ---------------------------- //

// invoked for any requests passed to this router
router.use(function (req, res, next) {
  // .. some logic here .. like any other middleware
  next()
})

// will handle any request that ends in /events
// depends on where the router is "use()'d"
router.get('/events', function (req, res, next) {
  // ..
})

// ---------------------------- //

You can then use a router for a particular root URL in this 
way separating your routes into files or even mini-apps.

// ---------------------------- //

// only requests to /calendar/* will be sent to our "router"
app.use('/calendar', router)

// ---------------------------- //

*/
// ROUTES
app.use('/', viewRouter);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// ---------------------------- //

// ------------------------------------------------------- //

// ======================================================= //
// -------- Handling unhandled requests and routes ------- //
// ======================================================= //

/* The route that is requested will reach here only if it not
 handled by other router and route handler.*/

app.all('*', (req, res, next) => {
  /* // Normal error handling
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
  */

  /* Passing the error to the error handler middleware
  const err = new Error(`Can't find ${req.originalUrl} on this server`);
  err.statusCode = 404;
  err.status = 'fail';
  next(err);
  */

  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});
// ------------------------------------------------------- //

app.use(globalErrorHandler);

module.exports = app;

// const testFunc = function (fn) {
//   fn('mark');
// };

// const testFunc2 = function (name) {
//   console.log(name);
// };

// testFunc(testFunc2); is same as testFunc(name => testFunc2(name))

// ------------------- TWEAKS ON HELMET ------------------- //

// {
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
//       baseUri: ["'self'"],
//       fontSrc: ["'self'", 'https:', 'data:'],
//       scriptSrc: [
//         "'self'",
//         'https:',
//         'http:',
//         'blob:',
//         'https://*.mapbox.com',
//         'https://js.stripe.com',
//         'https://m.stripe.network',
//         'https://*.cloudflare.com',
//       ],
//       frameSrc: ["'self'", 'https://js.stripe.com'],
//       objectSrc: ["'none'"],
//       styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
//       workerSrc: [
//         "'self'",
//         'data:',
//         'blob:',
//         'https://*.tiles.mapbox.com',
//         'https://api.mapbox.com',
//         'https://events.mapbox.com',
//         'https://m.stripe.network',
//       ],
//       childSrc: ["'self'", 'blob:'],
//       imgSrc: ["'self'", 'data:', 'blob:'],
//       formAction: ["'self'"],
//       connectSrc: [
//         "'self'",
//         "'unsafe-inline'",
//         'data:',
//         'blob:',
//         'https://*.stripe.com',
//         'https://*.mapbox.com',
//         'https://*.cloudflare.com/',
//         'https://bundle.js:*',
//         'ws://127.0.0.1:*/',
//       ],
//       upgradeInsecureRequests: [],
//     },
//   },
// }

// ------------------------------------------------------- //
