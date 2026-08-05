const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    custom_id: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    price: {
      type: String,
      required: [true, "Product price is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Product image URL is required"],
    },
    cloudinary_id: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for id getter/setter to support both _id and legacy id
productSchema.virtual("id_str").get(function () {
  return this._id ? this._id.toString() : this.custom_id;
});

module.exports = mongoose.model("Product", productSchema);
