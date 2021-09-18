const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const catchAsync = require('../utils/catchAsync');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const factory = require('./handlerFactory');

exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

// exports.getBookings = catchAsync(async (req, res, next) => {
//   const bookings = await Booking.find({ user: req.user.id });
//   const bookedTours = bookings.map((booking) => booking.tour._id);
//   console.log(bookedTours);
//   res.status(200).json({
//     status: 'success',
//     data: {
//       data: bookedTours,
//     },
//   });
// });

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2. Create checkout session
  const session = await stripe.checkout.sessions.create({
    // Information about the session
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email, // saves a stem for user and makes the payment process more smoother
    client_reference_id: req.params.tourId, // extra field into which we can actually specify the values which we would want into the session object when the purchase is done for updating he bookings into the database
    // information about the product that the user is purchasing
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [
          `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
        ],
        amount: tour.price * 100, // amount should be specified in cents
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3. Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
//   const { tour, user, price } = req.query;
//   if (!tour || !user || !price) return next();
//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  console.log(`😉Tour: ${tour}`);
  const user = await User.findOne({ email: session.customer_email }).id;
  console.log(`😉User: ${user}`);
  const price = session.data.object.amount_total / 100;
  console.log(`😉Price: ${price}`);

  await Booking.create({ tour, user, price });
};

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);

    res.status(200).json({ received: true });
  }
};
