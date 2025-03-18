# Gung AB Product List

Angular web application that allows users to browse, filter, and sort products.

According to extra assignment specifications:

  In src/app/components/product-list/product-list.component.ts:

   getCategories() is called from line 80, in the method ngOnInit(), if wanting to use getAlotOfCategories() instead

   getProduct(id) is called from line 125, in the method extractProducts(category),
      if wanting to exchange it with getRandomProduct(id) to use alongside getCategories()

---

## 🚀 Features

### 🔍 **Search & Filtering:**
- **Name, ID, or Category:** Quickly search through products using an intuitive search bar.
- **Price Range:** Specify minimum and maximum prices.
- **Volume Range:** Filter products based on volume ranges.
- **Stock Availability:** Easily filter products based on availability.
- **Category Selection:** Filter products by selecting one or multiple categories.

### ↕️ **Sorting:**
- Easily sort by clicking column headers:
  - Name
  - ID
  - Price
  - Stock Availability
  - Volume
  - Category

### ⚡ **Performance Optimization:**
- Leverages **Web Workers** and **RxJS** for efficient data handling and smooth interactions.

---

## 📦 Getting Started

### 1. **Clone the Repository:**
```sh
git clone https://github.com/your-repository/gung-product-list.git
cd gung-product-list
```

### 2️⃣ **Install Dependencies:**

```sh
npm install
```

### 3️⃣ **Run the Development Server:**

```sh
ng serve
```

Then open [http://localhost:4200](http://localhost:4200/) in your browser.

---

## 📂 Project Structure

```
src/
├── app/
│   ├── components/          # UI Components
│   ├── services/            # Data fetching services
│   └── utils/               # Utility/helper functions
├── assets/                  # Static assets (images, fonts, etc.)
├── app.component.*          # Root app component
├── app.routes.ts            # Application routing
├── main.ts                  # Application entry point
└── styles.scss              # Global styles
```

---

## 🛠️ Technologies
- Angular (Standalone Components)
- RxJS
- Bootstrap 5
- Angular Web Workers

---

## ⚙️ **Customization & Extensions:**

You can easily extend the application by:
- Adding more filtering criteria.
- Enhancing UI/UX design.
- Extending sorting capabilities.

---

### 📜 License

MIT License

---

Made with ❤️ and Angular.

