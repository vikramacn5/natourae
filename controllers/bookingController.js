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
    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email, // saves a step for user and makes the payment process more smoother
    client_reference_id: req.params.tourId,
    /* extra field into which we can specify the 
    values which we would want into the session object when the purchase is done for 
    updating he bookings into the database */

    /* information about the product that the user is 
    purchasing so that thhey can be used in the checkout page 
    annd as wellas in the dashboard of tthe stripe service */
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
  /* This session is exactly the session that we created by 
  ourself in the getCheckoutSession function */
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount_total / 100;
  /* amount_total will be in cents and we need to convert 
  that into dollars */

  await Booking.create({ tour, user, price });
};

exports.webhookCheckout = async (req, res, next) => {
  /* When stripe make the post request to this route it 
  actually sends a signature for this webhook in the header */
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // body need to ne in raw format(String)
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    /* Checking if the event is exacty same as what we 
    specified in the stripe dashboard */
    await createBookingCheckout(event.data.object);
    // this is the session object
  }
  res.status(200).json({ received: true });
};
