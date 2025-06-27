# 🎮 FC25 Template Uploader

Upload advanced post templates to Firestore for your FC25 community forum.

## 📋 What This Does

This script uploads pre-designed post templates to your Firestore database. Users can then select these templates when creating posts in your React Native app.

**Current Templates:**
- ⭐ **Player Card Review** - Complete FC25/26 player card analysis template with stats, gameplay review, and community rating

## 🚀 Quick Start

### 1. Prerequisites
- Node.js installed (v16 or higher)
- Firebase Admin SDK service account key
- Access to `fc25assistant` Firebase project

### 2. Setup
```bash
# Install dependencies
npm install

# Verify your serviceAccountKey.json is in this folder
ls -la serviceAccountKey.json
```

### 3. Upload Templates
```bash
# Upload all templates
npm run upload

# Or run directly
node upload-template.js
```

### 4. Verify Success
- Check the console output for success messages
- Visit Firebase Console to see uploaded templates
- Test in your React Native app's TemplateSelector

## 📁 File Structure

```
upload-script/
├── package.json              # Dependencies
├── serviceAccountKey.json    # Firebase credentials (KEEP SECURE!)
├── upload-template.js        # Main upload script
└── README.md                # This file
```

## 🔧 Script Features

### ✅ What It Does
- **Initialize Firebase Admin SDK** with your credentials
- **Check existing templates** before uploading
- **Upload templates** to `AdvancedPostTemplates` collection
- **Verify uploads** by reading back the data
- **Add timestamps** automatically (createdAt, updatedAt)
- **Detailed logging** with status updates and URLs

### 🛡️ Safety Features
- Checks for existing Firebase instances
- Error handling with detailed messages
- Verification step after upload
- Non-destructive (only adds, doesn't delete)

## 📊 Expected Output

```
🎮 FC25 Template Upload Script
================================
✅ Firebase Admin initialized successfully
📋 Checking existing templates...
📭 No existing templates found

🚀 Starting upload process...
📤 Uploading template: ⭐ Player Card Review
✅ Template uploaded successfully!
📄 Document ID: abc123xyz789
🔗 Firestore URL: https://console.firebase.google.com/...

🔍 Verifying upload...
✅ Verification successful!
📋 Template name: ⭐ Player Card Review
📊 Sections count: 5
🎯 Category: review
⭐ Is VIP: false

🎉 SUCCESS! Template is ready to use.
💡 You can now test it in your TemplateSelector component.

✨ Script completed. Exiting...
```

## 🎯 Template Structure

Each template includes:

### **Core Properties**
- `name` - Display name (e.g., "⭐ Player Card Review")
- `description` - What the template is for
- `category` - Template category ('review', 'analysis', etc.)
- `difficulty` - User skill level required
- `isVIP` - Whether VIP membership is required
- `estimatedTime` - How long to complete (minutes)

### **Sections Array**
Each section defines:
- `type` - Section type ('text', 'image', 'table', 'quote', 'poll')
- `label` - Section heading
- `style` - Text styling (color, font, alignment, etc.)
- `config` - Section configuration (placeholder, height, etc.)
- `exampleData` - Pre-filled example data for the section

### **Metadata**
- `features` - Key template features
- `useCase` - When to use this template
- `tags` - Search/filter tags
- `gradient` - UI color scheme

## 🔍 Troubleshooting

### ❌ "Firebase initialization failed"
- Check `serviceAccountKey.json` exists and is valid JSON
- Verify project_id matches "fc25assistant"
- Ensure file permissions allow reading

### ❌ "Permission denied"
- Verify your service account has Firestore write permissions
- Check Firebase project settings and IAM roles

### ❌ "Collection not found"
- The script creates the collection automatically
- Ensure collection name matches your app (`AdvancedPostTemplates`)

### ❌ "Template already exists"
- Script adds new documents, doesn't overwrite
- Check Firestore console for existing templates
- Each run creates a new document with unique ID

## 🧪 Testing

### Before Upload
1. **Dry Run** - Comment out the actual upload line to test Firebase connection
2. **Check Logs** - Ensure all console.log messages show expected data
3. **Validate JSON** - Verify template structure matches your app's interface

### After Upload
1. **Firebase Console** - Check the new document exists
2. **React Native App** - Test TemplateSelector shows new template
3. **Create Post** - Try using the template to create an actual post

## 🔒 Security Notes

### 🚨 IMPORTANT
- **Never commit `serviceAccountKey.json` to git**
- Add to `.gitignore` immediately
- Keep service account credentials secure
- Only run on trusted environments

### Best Practices
```bash
# Add to .gitignore
echo "serviceAccountKey.json" >> .gitignore

# Verify it's ignored
git status
```

## 📈 Adding New Templates

### 1. Create Template Object
```javascript
const NEW_TEMPLATE = {
  id: 'unique_template_id',
  name: '🎯 Template Name',
  // ... full template structure
};
```

### 2. Add to Script
```javascript
// In upload-template.js, add to templates array
const templates = [
  PLAYER_CARD_REVIEW_TEMPLATE,
  NEW_TEMPLATE, // Add here
];
```

### 3. Upload
```bash
npm run upload
```

## 🤝 Need Help?

### Common Issues
- **Template not showing in app** - Check `isActive: true` and app restart
- **Sections not rendering** - Verify section types match your components
- **Styling not applied** - Check style object matches TextStyle interface

### Debug Steps
1. Check Firebase Console for the uploaded document
2. Verify document structure matches expected format
3. Test template selection in React Native debugger
4. Check app logs for any errors during template loading

## 📚 Related Files

This uploader works with these components in your React Native app:
- `TemplateSelector.tsx` - Shows available templates
- `AdvancedTemplateEditor.tsx` - Uses templates for post creation
- `SectionContentEditor.tsx` - Renders individual sections
- Firebase config - Connects to same Firestore database

---

**🎉 Happy uploading!** Your FC25 community will love these templates.