/* eslint-disable */

import '@babel/polyfill';
// import { updatePassword } from '../../controllers/authController.js';
import { login, logout } from './login.js';
import { displayMap } from './mapbox.js';
import { updateSettings } from './updateSettings.js';
import { bookTour } from './stripe.js';
import { showAlert } from './alerts.js';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const photoSelect = document.getElementById('photo');
const bookBtn = document.getElementById('book-tour');

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logOutBtn) {
  logOutBtn.addEventListener('click', logout);
}

if (userDataForm) {
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    /* Making this form as a multipart form data 
    programatically so that it allows us to upload the 
    files as well through the form */
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    updateSettings(form, 'data');
    // const name = document.getElementById('name').value;
    // const email = document.getElementById('email').value;
    // updateSettings({ name, email }, 'data');
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordCurrent = document.getElementById('password-current').value;
    const passwordUpdated = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, passwordUpdated, passwordConfirm },
      'password'
    );

    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}

if (photoSelect) {
  photoSelect.addEventListener('change', function () {
    const file = this.files[0];
    // console.log(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.addEventListener('load', function () {
      document.querySelector('.form__user-photo').src = this.result;
    });
  });
}

/* we need to show some kind of feedback to the user when 
the booking is successful but this time it is not that 
straight because usually we would make an api call and with 
the response we will be using the javaScript to create the 
alert but now we are not doing any api call it's the stripe 
service which calls the success url when the payment becomes 
successful so here we are creating a solution that we can 
reuse and can be used all over the application. The first 
thing that we are doing here is we are adding a query string 
on too the success url but we can use that on any url that 
directs us to our website as we have implemented in a way 
that we can reuse it all over the application. Now in the 
query string we are giving a parameter called alert, as per 
the alert's value we will be creating the alert message and 
display it on the website. Now we will create a middleware 
that will be run before all the requests that we do for our 
website and that middleware takes the alert value form the 
query and creates as per the alert value and puts the 
message on res.locals.alert, Now all the templates will 
have a variable named alert and we are putting that alert 
variable on the body element's data attribute and then we 
will take that in the index.js and render a alert message 
on the website.  */

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 20);
