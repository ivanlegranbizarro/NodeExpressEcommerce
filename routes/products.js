const { Product } = require('../models/product');
const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');

const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error('Invalid image type');
    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, 'public/uploads');
  },
  filename: function (req, file, cb) {
    const filename = file.originalname.split(' ').join('-');
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${filename}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({ storage });

// Consulta la lista de productos y examina si hay un query con la categoría
// Si lo hay, devuelve productos según la categoría que le pasemos, si no,
// devuelve la lista completa de productos
router.get('/products', async (req, res) => {
  let filterCategory = {};
  if (req.query.categories) {
    filterCategory = { category: req.query.categories.split(',') };
  }
  let productList = await Product.find(filterCategory)
    .populate('category')
    .select('name price')
    .populate('category');

  if (!productList) {
    res.status(500).json({ success: false });
  }
  res.send(productList);
});

// Consulta un producto en concreto usando su ID como parámetro
router.get('/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category');
  if (!product) {
    res.status(500).json({ success: false });
  }
  res.send(product);
});

// Ingresa un nuevo producto
router.post('/products', uploadOptions.single('image'), async (req, res) => {
  let category = await Category.findById(req.body.category);
  if (!category) return res.status(400).send('Invalid Category');

  const file = req.file;
  if (!file) return res.status(400).send('No File');

  const fileName = req.file.filename;
  const basePath = `${req.protocol}://${req.get('host')}//public/uploads/`;
  let product = new Product({
    name: req.body.name,
    description: req.body.description,
    richDescription: req.body.richDescription,
    image: `${basePath}${fileName}`,
    brand: req.body.brand,
    price: req.body.price,
    category: req.body.category,
    countInStock: req.body.countInStock,
    rating: req.body.rating,
    numReviews: req.body.numReviews,
    isFeatured: req.body.isFeatured,
  });
  product = await product.save();
  if (!product) return res.status(500).send('The product can not be created');
  res.send(product);
});

// Hacemos un update para, una vez creado el producto,
// implementar una galería de fotos
router.put(
  'products/gallery-images/:id',
  uploadOptions.array('images', 10),
  async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).send('Invalid Product Id');
    }

    const files = req.files;
    let imagesPath = [];
    const basePath = `${req.protocol}://${req.get('host')}//public/uploads/`;

    if (files) {
      files.map((file) => {
        imagesPath.push(`${basePath}${file.fileName}`);
      });
    }

    const updatedproduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagesPath,
      },
      { new: true }
    );
    if (!updatedproduct) res.status(400).send('The product can not be updated');

    res.send(updatedproduct);
  }
);

// Actualiza un producto
router.put('/products/:id', uploadOptions.single('image'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).send('Invalid Product Id');
  }
  const category = await Category.findById(req.body.category);
  if (!category) return res.status(400).send('Invalid Category');

  const file = req.file;
  let imagepath;

  if (file) {
    const fileName = file.filename;
    imagepath = `${basePath}${fileName}`;
  } else {
    imagepath = product.image;
  }

  const updatedproduct = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      description: req.body.description,
      richDescription: req.body.richDescription,
      image: imagepath,
      brand: req.body.brand,
      price: req.body.price,
      category: req.body.category,
      countInStock: req.body.countInStock,
      rating: req.body.rating,
      numReviews: req.body.numReviews,
      isFeatured: req.body.isFeatured,
    },
    { new: true }
  );
  if (!updatedproduct) res.status(400).send('The product can not be updated');

  res.send(updatedproduct);
});

// Eliminar un producto
router.delete('/products/:id', (req, res) => {
  Product.findByIdAndDelete(req.params.id)
    .then((product) => {
      if (product) {
        res.status(200).json({
          success: true,
          message: 'The product was successfully deleted.',
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'The product could not be found.',
        });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

router.get('/products/get/count', async (req, res) => {
  const productCount = await Product.countDocuments((count) => count);
  if (!productCount) {
    res.status(500).json({ success: false });
  }
  res.json({
    count: productCount,
  });
});

// Filtrar por productos featured (destacados)
router.get('/products/get/featured/:count', async (req, res) => {
  const count = req.params.count ? req.params.count : 0;
  let products = await Product.find({
    isFeatured: true,
  }).limit(+count);
  if (!products) {
    res.status(500).json({ success: false, message: 'No products featured' });
  }
  res.json({
    products,
  });
});

module.exports = router;
