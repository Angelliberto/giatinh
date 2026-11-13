import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const heroImageSchema = new Schema(
  {
    caption: { type: String, required: true, default: 'Untitled' },
    imageUrl: { type: String, required: true },
    publicId: { type: String, default: null },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

heroImageSchema.index({ order: 1 });

export type HeroImageDoc = InferSchemaType<typeof heroImageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const HeroImage = mongoose.model('HeroImage', heroImageSchema);
