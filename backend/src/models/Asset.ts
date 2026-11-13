import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const assetSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw'],
      required: true,
      default: 'image',
    },
    filename: { type: String, required: true },
    folder: { type: String, default: 'vault' },
  },
  { timestamps: true }
);

export type AssetDoc = InferSchemaType<typeof assetSchema> & { _id: mongoose.Types.ObjectId };

export const Asset = mongoose.model('Asset', assetSchema);
