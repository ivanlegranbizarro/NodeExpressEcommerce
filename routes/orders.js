const { Order } = require('../models/order');
const express = require('express');
const { OrderItem } = require('../models/order-item');
const router = express.Router();

// Consultar lista de encargos
router.get('/orders', async (req, res) => {
  const orderList = await Order.find()
    .populate('user', '_id name email')
    .populate({
      path: 'orderItems',
      populate: { path: 'product', populate: 'category' },
    })
    .sort({ dateOrdered: -1 });

  if (!orderList) {
    res.status(500).json({ success: false });
  }
  res.send(orderList);
});

// Consultar un encargo a través de su ID
router.get('/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', '_id name email')
    .populate({
      path: 'orderItems',
      populate: { path: 'product', populate: 'category' },
    });

  if (!order) {
    res.status(500).json({ success: false });
  }
  res.send(order);
});

// Crear un encargo
router.post('/orders', async (req, res) => {
  const orderItemsIds = Promise.all(
    req.body.orderItems.map(async (orderItem) => {
      let newOrderItem = new OrderItem({
        quantity: orderItem.quantity,
        product: orderItem.product,
      });

      newOrderItem = await newOrderItem.save();

      return newOrderItem._id;
    })
  );
  const orderItemsIdsResolved = await orderItemsIds;
  const totalPrices = await Promise.all(
    orderItemsIdsResolved.map(async (orderItemId) => {
      const orderItem = await OrderItem.findById(orderItemId).populate(
        'product',
        'price'
      );
      const totalPrice = orderItem.product.price * orderItem.quantity;
      return totalPrice;
    })
  );
  const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

  let order = new Order({
    orderItems: orderItemsIdsResolved,
    shippingAddress1: req.body.shippingAddress1,
    shippingAddress2: req.body.shippingAddress2,
    city: req.body.city,
    zip: req.body.zip,
    country: req.body.country,
    phone: req.body.phone,
    status: req.body.status,
    channel: req.body.channel,
    totalPrice,
    user: req.body.user,
  });
  order = await order.save();

  if (!order) return res.status(400).send('The order cannot be created');
  res.send(order);
});

// Cambiar el estado de un encargo
router.put('/orders/:id', async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
    },
    { new: true }
  );
  if (!order) res.status(400).send('The order cannot be created');
  res.send(order);
});

// Eliminar un encargo
router.delete('/orders/:id', (req, res) => {
  Order.findByIdAndDelete(req.params.id)
    .then(async (order) => {
      if (order) {
        await order.orderItems.map(async (orderItem) => {
          await OrderItem.findByIdAndDelete(orderItem);
        });
        return res.status(200).json({
          success: true,
          message: 'The order was deleted successfuly',
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "This order didn't exist" });
      }
    })
    .catch((err) => {
      return res.status(500).json({ success: false, error: err });
    });
});

// Obtener el saldo total con la suma de todos los encargos
router.get('/orders/get/total', async (req, res) => {
  const totalSales = await Order.aggregate([
    { $group: { _id: null, totasales: { $sum: 'totalPrice' } } },
  ]);
  if (!totalSales) {
    return res.status(400).send('The order cannot be retrieved');
  }
  res.send({ total: totalSales.pop().totasales });
});

// Devolver el total de encargos acumulados
router.get('/orders/get/count', async (req, res) => {
  const orderCount = await Order.countDocuments((count) => count);
  if (!orderCount) {
    res.status(500).json({ success: false });
  }
  res.send({ orderCount });
});

// Consultar los encargos de un usuario a través de su ID
router.get('/orders/get/userorders/:userid', async (req, res) => {
  const userOrderList = await Order.find({ user: req.params.userid })
    .populate({
      path: 'orderItems',
      populate: {
        path: 'product',
        populate: 'category',
      },
    })
    .sort({ dateOrdered: -1 });
  if (!userOrderList) {
    res.status(500).json({ success: false });
  }
  res.send({ userOrderList });
});

module.exports = router;
