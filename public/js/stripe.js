import axios from 'axios';
import { showAlert } from './alerts.js';

export const bookTour = async (tourId) => {
  try {
    // 1. Get chackout seession from API
    const stripe = Stripe(
      'pk_test_51JZVWRSIt9BxtkVNLVLnFWIQvufPk0ABuEqLsNVRhGJNkhjOPubYAXzvKYz7HESFjbA9NlZtSXSwCTOLgnPV7dlG002m4VVRtB'
    );
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);

    // 2. Create checkout form and charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
