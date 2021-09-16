import axios from 'axios';

import { showAlert } from './alerts.js';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    const url = `/api/v1/users/${
      type === 'password' ? 'updateMyPassword' : 'updateMe'
    }`;
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });

    if (res.data.status === 'success') {
      if (type === 'data') location.reload(true);
      showAlert('success', `${type.toUpperCase()} updated sccessfully!`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

// export const updatePassword = async (
//   passwordCurrent,
//   passwordUpdated,
//   passwordConfirm
// ) => {
//   try {
//     const res = await axios({
//       method: 'PATCH',
//       url: 'http://127.0.0.1:3000/api/v1/users/updateMyPassword',
//       data: {
//         passwordCurrent,
//         passwordUpdated,
//         passwordConfirm,
//       },
//     });

//     if (res.data.status === 'success') {
//       showAlert('success', 'password updated successfully!');
//     }
//   } catch (err) {
//     showAlert('error', err.response.data.message);
//   }
// };
