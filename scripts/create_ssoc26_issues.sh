#!/bin/bash

# Ensure gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) could not be found. Please install it first."
    exit 1
fi

echo "Creating SSoC26 Issues for AgroNavis..."

# Ensure we have the labels created
gh label create SSoC26 --color 0e8a16 --description "Social Summer of Code 2026" --force || true
gh label create easy --color 006b75 --description "Good for beginners" --force || true
gh label create medium --color fbca04 --description "Requires some experience" --force || true
gh label create hard --color b60205 --description "Complex feature or architectural change" --force || true
gh label create frontend --color 1d76db --force || true
gh label create backend --color 5319e7 --force || true
gh label create ai-ml --color e99695 --force || true
gh label create documentation --color 0075ca --force || true

# Issue 1
gh issue create \
  --title "Add Dark Mode support to the entire dashboard" \
  --body "Currently, the app only supports a light theme and a high contrast mode. We need a proper Dark Mode implementation using Tailwind CSS dark classes for the entire dashboard and components." \
  --label "SSoC26,medium,frontend"

# Issue 2
gh issue create \
  --title "Implement Internationalization (i18n) for Hindi and Spanish" \
  --body "AgroNavis currently supports English. We want to make it accessible to farmers worldwide. Implement i18next translations for Hindi and Spanish in the frontend." \
  --label "SSoC26,medium,frontend"

# Issue 3
gh issue create \
  --title "Write comprehensive Unit Tests for Fertilizer Calculation logic" \
  --body "The FertilizerRecommendation component calculates complex NPK requirements and costs. Add Jest unit tests to verify the math is correct across different soil types and crops." \
  --label "SSoC26,easy,frontend"

# Issue 4
gh issue create \
  --title "Optimize CropScan AI image compression before upload" \
  --body "Users in rural areas have slow internet. Before uploading an image to the backend for disease detection, the frontend should compress and resize the image using a library like browser-image-compression." \
  --label "SSoC26,medium,frontend"

# Issue 5
gh issue create \
  --title "Create a comprehensive README and CONTRIBUTING.md" \
  --body "Our open source repository needs a beautifully structured README with architecture diagrams, setup instructions, and a CONTRIBUTING.md guide for new developers." \
  --label "SSoC26,easy,documentation"

# Issue 6
gh issue create \
  --title "Migrate backend database queries from supabase-js to Prisma ORM" \
  --body "Currently the FastAPI backend uses the Supabase Python client. We want to explore migrating to Prisma for Python (or SQLAlchemy with proper migrations) to enforce strict types." \
  --label "SSoC26,hard,backend"

# Issue 7
gh issue create \
  --title "Add skeleton loading states for Analytics Dashboard" \
  --body "When the analytics page loads, it shows a generic spinner. Replace this with modern skeleton loader components that match the shape of the charts." \
  --label "SSoC26,easy,frontend"

# Issue 8
gh issue create \
  --title "Implement Offline-First sync for Farm Fields using IndexedDB" \
  --body "Farmers often lose connection in the field. When drawing a new farm boundary, save it to IndexedDB first via localforage, and sync it to the backend automatically when the network returns." \
  --label "SSoC26,hard,frontend"

# Issue 9
gh issue create \
  --title "Add support for 10 new crops in Fertilizer logic" \
  --body "The system currently only supports Wheat, Rice, Cotton, and Sugarcane. Research and add the standard NPK requirements for 10 more common crops (e.g. Maize, Soybean, Potato)." \
  --label "SSoC26,easy,frontend"

# Issue 10
gh issue create \
  --title "Improve Accessibility (a11y) of the Navigation Sidebar" \
  --body "The sidebar needs proper ARIA labels, keyboard navigation (tabbing), and focus rings to comply with WCAG 2.1 AA standards." \
  --label "SSoC26,medium,frontend"

# Issue 11
gh issue create \
  --title "Add Weather Forecast caching to reduce API calls" \
  --body "The WeatherBlock component fetches the forecast on every mount. Implement a 30-minute cache using localStorage or a React context to prevent rate-limiting." \
  --label "SSoC26,easy,frontend"

# Issue 12
gh issue create \
  --title "Integrate an open-source LLM for the Agronomy Chatbot" \
  --body "Currently, the chatbot might rely on an external API. Explore swapping the backend AI logic to use a smaller open-source model (like Llama 3 8B) hosted via vLLM or Ollama." \
  --label "SSoC26,hard,ai-ml,backend"

# Issue 13
gh issue create \
  --title "Fix overlapping tooltips on the Farm Map" \
  --body "When multiple fields are drawn close to each other, their Leaflet tooltips overlap and become unreadable. Implement a collision detection logic or clustering for the markers." \
  --label "SSoC26,medium,frontend"

# Issue 14
gh issue create \
  --title "Create a Docker compose setup for local development" \
  --body "New contributors struggle to set up the Python backend and Next.js frontend. Create a docker-compose.yml file that spins up both services with hot-reloading." \
  --label "SSoC26,medium,backend"

# Issue 15
gh issue create \
  --title "Add CI/CD pipeline for automated testing and linting" \
  --body "Expand our GitHub Actions workflow to run ESLint, Prettier, and Jest tests on every Pull Request before it can be merged." \
  --label "SSoC26,easy,backend"

echo "All 15 issues have been successfully created!"
