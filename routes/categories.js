const { Category } = require("../models/category");
const express = require("express");
const router = express.Router();

// Consulta listado con todas las categorías
router.get("/categories", async (req, res) => {
  const categoryList = await Category.find();

  if (!categoryList) {
    res.status(500).json({ success: false });
  }
  res.status(200).send(categoryList);
});

// Devuelve una categoría en concreto pasándole el ID como parámetro
router.get("/categories/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res
      .status(500)
      .json({ message: "The category with the given ID was not found" });
  }
  res.status(200).send(category);
});

// Guarda una nueva categoría
router.post("/categories", async (req, res) => {
  let category = new Category({
    name: req.body.name,
    icon: req.body.icon,
    color: req.body.color,
  });
  category = await category.save();
  if (!category)
    return res.status(404).send("The category could not be created.");
  res.send(category);
});

// Actualiza una categoría
router.put("/categories/:id", async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
    },
    { new: true }
  );
  if (!category)
    return res.status(404).send("The category could not be updated.");
  res.send(category);
});

// Elimina una categroía
router.delete("/categories/:id", (req, res) => {
  Category.findByIdAndDelete(req.params.id)
    .then((category) => {
      if (category) {
        res.status(200).json({
          success: true,
          message: "The category was successfully deleted.",
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "The Category could not be found.",
        });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

module.exports = router;
