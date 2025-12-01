# Release Guide for Dr Migrate TIRE App

## How to Create a New Release

The project uses GitHub Actions to automatically build and release the application when a version tag is pushed.

### Release Process Overview

1. **Update Version**: Update version in `package.json`
2. **Update Release Notes**: Add release notes to `release-notes.md`
3. **Commit Changes**: Commit all changes
4. **Create Tag**: Create and push a git tag (format: `v1.0.3`)
5. **Automatic Build**: GitHub Actions automatically builds Windows and Mac versions
6. **Release Created**: Release is created on GitHub with all artifacts

### Step-by-Step Instructions

#### Step 1: Update Version and Release Notes

1. Update `package.json` version number (e.g., `1.0.3`)
2. Update `release-notes.md` with new version section at the top
3. Update `README.md` if needed

#### Step 2: Commit Changes

```bash
git add package.json release-notes.md README.md
git commit -m "Release v1.0.3: [Brief description of changes]"
git push origin main
```

#### Step 3: Create and Push Release Tag

```bash
# Create the tag (replace 1.0.3 with your version)
git tag v1.0.3

# Push the tag to trigger the release workflow
git push origin v1.0.3
```

#### Step 4: Monitor Release Build

1. Go to GitHub repository: https://github.com/AltraCloud/TIREApp
2. Click on "Actions" tab
3. Watch the "Build and Release TIRE App" workflow run
4. The workflow will:
   - Create the GitHub release
   - Build Windows version (`.exe` file)
   - Build Mac version (`.zip` file)
   - Upload both to the release

#### Step 5: Verify Release

1. Go to the Releases page: https://github.com/AltraCloud/TIREApp/releases
2. Verify the release was created with:
   - Release title: "Dr Migrate TIRE App v1.0.3"
   - Release notes from `release-notes.md`
   - Windows executable: `Dr-Migrate-TIRE-App 1.0.3.exe`
   - Mac archive: `Dr-Migrate-TIRE-App-1.0.3-arm64-mac.zip`
   - Source code archive: `Dr-Migrate-TIRE-App-1.0.3-source.zip`

### Workflow Details

The GitHub Actions workflow (`.github/workflows/release.yml`) automatically:

- **Triggers**: When a tag matching `v*` is pushed
- **Extracts Version**: From the tag name (e.g., `v1.0.3` → `1.0.3`)
- **Creates Release**: Uses `release-notes.md` as the release body
- **Builds Windows**: Creates portable `.exe` file
- **Builds Mac**: Creates `.zip` archive for ARM64
- **Uploads Artifacts**: All builds are attached to the GitHub release

### Version Numbering

Follow semantic versioning:
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

Current version: **1.0.3**

### Troubleshooting

**Workflow fails:**
- Check GitHub Actions logs for errors
- Verify `GH_TOKEN` secret is set in repository settings
- Ensure Node.js version compatibility

**Build fails:**
- Check that all dependencies are in `package.json`
- Verify build scripts work locally (`npm run build:mac`, `npm run build:win`)

**Release not created:**
- Verify tag format is correct (`v1.0.3`, not `1.0.3`)
- Check that tag was pushed to remote
- Verify workflow file is in `.github/workflows/release.yml`

### Quick Release Command

For version 1.0.3, after committing changes:

```bash
git tag v1.0.3 && git push origin v1.0.3
```

This will trigger the automatic release build process.

