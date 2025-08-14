# Quicksand Font Setup

This project has been configured to use Quicksand fonts throughout the UI. To complete the setup, you need to add the font files to the project.

## Font Files Required

You need to download and add the following Quicksand font files to the `assets/fonts/` directory:

1. `Quicksand-Regular.ttf` - Regular weight (400)
2. `Quicksand-Medium.ttf` - Medium weight (500)
3. `Quicksand-SemiBold.ttf` - Semi-bold weight (600)
4. `Quicksand-Bold.ttf` - Bold weight (700)
5. `Quicksand-Light.ttf` - Light weight (300)

## Download Fonts

You can download Quicksand fonts from:

- **Google Fonts**: https://fonts.google.com/specimen/Quicksand
- **Font Squirrel**: https://www.fontsquirrel.com/fonts/quicksand

## Installation Steps

1. **Create fonts directory** (if it doesn't exist):

   ```bash
   mkdir -p assets/fonts
   ```

2. **Download the font files** and place them in `assets/fonts/`

3. **Verify file structure**:
   ```
   TodoApp/
   ├── assets/
   │   ├── fonts/
   │   │   ├── Quicksand-Regular.ttf
   │   │   ├── Quicksand-Medium.ttf
   │   │   ├── Quicksand-SemiBold.ttf
   │   │   ├── Quicksand-Bold.ttf
   │   │   └── Quicksand-Light.ttf
   │   ├── icon.png
   │   └── ...
   ```

## Font Usage

The fonts are configured in `lib/fonts.ts` and used throughout the app:

- **Regular**: Body text, descriptions
- **Medium**: Labels, secondary text
- **SemiBold**: Section titles, buttons
- **Bold**: Main titles, important text
- **Light**: Subtle text elements

## Verification

After adding the font files, restart your development server:

```bash
npm start
# or
expo start
```

The app should now display all text using Quicksand fonts. If you see any fallback fonts, check that:

1. Font files are in the correct directory
2. Font filenames match exactly (case-sensitive)
3. Development server has been restarted

## Troubleshooting

If fonts don't load:

1. Check the console for font loading errors
2. Verify font file paths in `app/_layout.tsx`
3. Ensure font files are valid TTF files
4. Try clearing Metro cache: `npx expo start --clear`
