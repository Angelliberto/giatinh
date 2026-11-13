import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const blockSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'video', 'playlist', 'heading', 'subtitle', 'carousel'],
      required: true,
    },
    content: { type: String, default: '' },
    url: { type: String, default: null },
    publicId: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const postSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    slug: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    blocks: { type: [blockSchema], default: [] },
    coverUrl: { type: String, default: null },
    coverPublicId: { type: String, default: null },
    coverFocus: {
      x: { type: Number, default: 50, min: 0, max: 100 },
      y: { type: Number, default: 50, min: 0, max: 100 },
    },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type PostDoc = InferSchemaType<typeof postSchema> & { _id: mongoose.Types.ObjectId };

export const Post = mongoose.model('Post', postSchema);
