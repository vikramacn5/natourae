const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  /* 
    Now for uncaught exceptions we actually need to crash the 
    application using process.exit() because if there is was 
    an uncaught eception then it means that our node app has 
    entered into an so called unclean state and  inorder to 
    fix it we need to terminate the process and restart it. 
    If an uncaught exception happens inside a middleware that 
    will actually be run only when a request is actually made, 
    also when it happens inside the midleware the error will 
    actually be taken to the global error handling middleware 
    and will be handled there as a non operational error.
  */
  console.log('UNCAUGHT EXCEPTION! 💣 Shutting down...!');
  console.log(err.name, err.message);
  process.exit(1);
});

// This path is relative to from where the node command is run
dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'));

// console.log(process.env);
// console.log(app.get('env'));

// ======================================================= //
// --------------------- START SERVER -------------------- //
// ======================================================= //

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`App running on port ${port}`)
);

// ------------------------------------------------------- //

// ======================================================= //
// ------------- Unhandled promise rejections ------------ //
// ======================================================= //

/*
  Unhandled promise rejections are errors that can happen in 
  our application but outside of mongoose or even outside of 
  the express itself. We need to handle those rejections by 
  listeninng to the event that will be emited by the process 
  object when there is a rejection in somewhere in our 
  applicaiton. So this is like a safety net like a last place 
  where the asynchronous errors will be handled at last if 
  they are not catched, this is like a global place we can 
  handle the asynchronous error. If we really have problems 
  connecting with our database then our application would not 
  actually work in c=that case we simply need to exit our 
  proocess but using process.exit() to exit our process is 
  really an abrupt way of exiting which will immediately abort 
  the pending or ongoing requests which is not ideal, so we 
  need to close the server first and that will take some time 
  to finish or process all the ongoing or pending requests 
  and executes the call back function and that is when we 
  need to exit our process. Exiting our process is not an 
  ideal thing to do so in big applications in real world 
  developers would develop a tool in order to restart our 
  application when it gets crashed or even some platforms 
  where we would host our node app would also do that 
  automatically. 
*/
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💣 Shutting down...!');
  console.log(err.name, err.message);
  /* These are kind of standard properties that are available
   on all errors in node.js */
  server.close(() => {
    process.exit(1); // exitting with code 1 is the usual.
  });
});

// ------------------------------------------------------- //
