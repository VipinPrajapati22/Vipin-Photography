# Macro Vipin Photography

## Local development

```powershell
npm run dev
```

Open `http://localhost:8000`.

The gallery API reads image files from `public/assets/<genre>/`. Add JPG, JPEG, PNG, WebP, or AVIF files to a genre folder, then refresh the matching gallery page.

## GitHub and Vercel deployment

1. Create a GitHub repository and push this folder to it.
2. In Vercel, select **Add New Project** and import that GitHub repository.
3. Keep the framework preset as **Other**. Vercel reads `vercel.json` automatically.
4. Deploy. Every future push to the connected GitHub branch creates a new Vercel deployment.

The Vercel function at `/api/gallery/[gallery]` dynamically reads the image folders bundled with each deployment.
"# Vipin-Photography" 
