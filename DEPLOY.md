# Deployment Instructions for Render

## Environment Variables

Set these in your Render dashboard:

- `MONGO_URI` - Your MongoDB connection string
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
- `PORT` - Will be set automatically by Render (optional)

## Build & Start Commands

- **Build Command**: `npm install`
- **Start Command**: `npm start`

## Notes

- The app will automatically use the PORT provided by Render
- Make sure all environment variables are set before deploying
- Check logs in Render dashboard if you encounter any issues
