const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//Obtiene una lista de todos los usuarios
router.get('/users', async (req, res) => {
  const userList = await User.find().select('name phone email');

  if (!userList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(userList);
});

// Obtener un solo usuario
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');

  if (!user) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(user);
});
//Registrar un nuevo usuario
router.post('/users/register', async (req, res) => {
  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(req.body.password, 10),
    phone: req.body.phone,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    zip: req.body.zip,
    city: req.body.city,
    country: req.body.country,
  });
  user = await user.save();
  if (!user) return res.status(400).send('The user cannot be created');

  res.send(user);
});

//Login a través del email
router.post('/users/login', async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  });
  const secret = process.env.secret;
  if (!user) {
    return res.status(400).send('User not found');
  }
  if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
    const token = jwt.sign(
      {
        userId: user._id,
        isAdmin: user.isAdmin,
      },
      secret,
      { expiresIn: '1d' }
    );
    res.status(200).send({ user: user.email, token: token });
  } else {
    res.status(400).send('Password is wrong');
  }
  return res.send(200).send(user);
});

router.get('/users/get/count', async (req, res) => {
  const userCount = await User.countDocuments((count) => count);

  if (!userCount) {
    res.status(500).json({ success: false });
  }
  res.send({ userCount });
});

router.delete('/users/:id', (req, res) => {
  User.findOneAndRemove(req.params.id).then((user) => {
    if (!user) {
      res.status(500).json({ error: 'The user was not register' });
    }
    res.status(200).json({ message: 'User was deleted successfully' });
  });
});

module.exports = router;
