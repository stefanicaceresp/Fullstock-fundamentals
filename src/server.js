import express from "express";
import path from "path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.use(express.static("assets"));

// ================= CARRITO EN MEMORIA =================
let cart = [];

// ================= READ CATEGORIES =================
async function readCategories() {
  try {
    const content = await readFile(
      path.join(__dirname, "categories.json"),
      "utf8"
    );
    return JSON.parse(content);
  } catch (error) {
    console.log(error.message);
    return [];
  }
}

// ================= READ CART =================
async function readCart() {
  try {
    const content = await readFile(
      path.join(__dirname, "cart.json"),
      "utf8"
    );
    cart = JSON.parse(content);
  } catch {
    cart = [];
  }
}

// ================= SAVE CART =================
async function saveCart() {
  await writeFile(
    path.join(__dirname, "cart.json"),
    JSON.stringify(cart, null, 2)
  );
}

// ================= HOME =================
async function homeHandler(req, res) {
  const categories = await readCategories();
  res.render("index", { categories });
}

// ================= CATEGORY =================
async function categoryHandler(req, res) {
  const categories = await readCategories();
  const categoryId = Number(req.params.id);

  const category = categories.find(cat => cat.id === categoryId);
  if (!category) return res.status(404).send("Categoría no encontrada");

  // 🔥 CAPTURAR FILTROS
  const min = req.query.min ? Number(req.query.min) : undefined;
  const max = req.query.max ? Number(req.query.max) : undefined;

  let products = category.products;

  if (min !== undefined) {
    products = products.filter(p => p.price >= min);
  }

  if (max !== undefined) {
    products = products.filter(p => p.price <= max);
  }

  // 🔥 IMPORTANTE: PASAR min Y max A LA VISTA
  res.render("category", {
    category: { ...category, products },
    min,
    max
  });
}


// ================= PRODUCT DETAIL =================
async function productHandler(req, res) {
  const categories = await readCategories();
  const productId = Number(req.params.id);

  let productFound = null;

  for (const category of categories) {
    const product = category.products.find(p => p.id === productId);

    if (product) {
      productFound = {
        ...product,
        category: category.name   // 🔥 AQUÍ ESTÁ LA CLAVE
      };
      break;
    }
  }

  if (!productFound) {
    return res.status(404).send("Producto no encontrado");
  }

  res.render("products", { product: productFound });
}


// ================= ADD TO CART =================
async function addToCartHandler(req, res) {
  await readCart();
  const categories = await readCategories();
  const productId = Number(req.params.id);
  const from = req.query.from || "/cart";

  let productFound = null;

  for (const category of categories) {
    const product = category.products.find(p => p.id === productId);
    if (product) {
      productFound = product;
      break;
    }
  }

  if (productFound) {
    const existing = cart.find(item => item.id === productId);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...productFound, quantity: 1 });
    }

    await saveCart();
  }

  res.redirect(from);
}

// ================= REMOVE FROM CART =================
async function removeFromCart(req, res) {
  await readCart();
  const id = Number(req.params.id);

  cart = cart.filter(item => item.id !== id);
  await saveCart();

  res.redirect("/cart");
}

// ================= CART =================
function cartHandler(req, res) {
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  res.render("cart", { cart, total });
}

// ================= CHECKOUT =================
function checkoutHandler(req, res) {
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  res.render("checkout", { cart, total });
}


// ================= CONFIRM ORDER =================
async function confirmOrderHandler(req, res) {
  const orderId = Math.floor(10000 + Math.random() * 90000);

  cart = [];
  await saveCart();

  res.redirect(`/order-confirmation?orderId=${orderId}`);
}

// ================= ORDER CONFIRMATION =================
function orderConfirmationHandler(req, res) {
  const orderId = req.query.orderId;
  res.render("order-confirmation", { orderId });
}

// ================= LOGIN / SIGNUP =================
function loginHandler(req, res) {
  res.render("login");
}

function signupHandler(req, res) {
  res.render("signup");
}

// ================= ABOUT / TERMS =================
function aboutHandler(req, res) {
  res.render("about");
}

function termsHandler(req, res) {
  res.render("terms");
}

// ================= ROUTES =================
app.get("/", homeHandler);
app.get("/categories/:id", categoryHandler);
app.get("/products/:id", productHandler);

app.get("/add-to-cart/:id", addToCartHandler);
app.get("/remove/:id", removeFromCart);

app.get("/cart", cartHandler);
app.get("/checkout", checkoutHandler);
app.get("/confirm-order", confirmOrderHandler);
app.get("/order-confirmation", orderConfirmationHandler);

app.get("/login", loginHandler);
app.get("/signup", signupHandler);
app.get("/about", aboutHandler);
app.get("/terms", termsHandler);

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
