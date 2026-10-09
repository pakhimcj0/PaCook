// ============================================================
// PaCook — новая версия App.js
// ЧАСТЬ 1 ИЗ 8
// Основа приложения, импорты, настройки и вспомогательные функции
// ============================================================
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
// ============================================================
// SUPABASE
// Используются настройки из текущего App.js в GitHub.
// ============================================================
const SUPABASE_URL =
  "https://fzjpsrcgmfihpnavnqdc.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_SfEpToq_GIgL37TYTNesIw_VAp6q5yt";
const PACOOK_URL =
  "https://pacook-l7lykxl6k-pa-cook.vercel.app";
const STORAGE_KEYS = {
  data: "PACOOK_DATA",
  profile: "PACOOK_PROFILE",
  settings: "PACOOK_SETTINGS",
};
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
// ============================================================
// ЦВЕТА И ОФОРМЛЕНИЕ
// ============================================================
const COLORS = {
  bg: "#F7F4EC",
  card: "#FFFDF8",
  green: "#345C48",
  green2: "#527966",
  lightGreen: "#E5EEE7",
  text: "#1D2922",
  muted: "#7A817C",
  border: "#E6E1D6",
  red: "#B94A48",
  white: "#FFFFFF",
  yellow: "#F4E7B2",
};
// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
function cleanString(value) {
  return String(value ?? "").trim();
}
function num(value) {
  const result = Number.parseFloat(
    String(value ?? "").replace(",", ".")
  );
  return Number.isFinite(result) ? result : 0;
}
function makeId(prefix = "item") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 9)
  );
}
function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function normalizeProduct(product = {}) {
  const name = cleanString(
    product.name || product.title
  );
  return {
    ...product,
    id: String(product.id || makeId("product")),
    name,
    category: cleanString(product.category) || "Другое",
    kcal: num(product.kcal ?? product.calories),
    protein: num(product.protein),
    fat: num(product.fat),
    carbs: num(product.carbs),
    fiber: num(product.fiber),
    image: cleanString(
      product.image || product.image_url
    ),
  };
}
function normalizeIngredient(item = {}) {
  const grams = num(
    item.grams ?? item.amount ?? item.weight
  );
  return {
    product: cleanString(
      typeof item.product === "string"
        ? item.product
        : item.productName
    ),
    productId: String(
      item.productId ||
      item.product_id ||
      item.product?.id ||
      ""
    ),
    grams,
    amount: grams,
  };
}
function normalizeRecipe(recipe = {}) {
  return {
    ...recipe,
    id: String(recipe.id || makeId("recipe")),
    title: cleanString(
      recipe.title || recipe.name
    ),
    category: cleanString(recipe.category) || "Другое",
    description: cleanString(recipe.description),
    image: cleanString(
      recipe.image || recipe.image_url
    ),
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map(normalizeIngredient)
      : [],
    steps: Array.isArray(recipe.steps)
      ? recipe.steps.map(String)
      : [],
    servings: Math.max(1, num(recipe.servings) || 1),
    prepTime: num(recipe.prepTime ?? recipe.prep_time),
    cookTime: num(recipe.cookTime ?? recipe.cook_time),
    pro: Boolean(recipe.pro),
  };
}
function calculateProductNutrition(product, grams) {
  const factor = num(grams) / 100;
  return {
    kcal: num(product?.kcal) * factor,
    protein: num(product?.protein) * factor,
    fat: num(product?.fat) * factor,
    carbs: num(product?.carbs) * factor,
  };
}
function calculateRecipeNutrition(recipe, products) {
  const result = {
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    totalGrams: 0,
  };
  const ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients
    : [];
  ingredients.forEach((ingredient) => {
    const id = String(
      ingredient.productId ||
      ingredient.product_id ||
      ""
    );
    const name = cleanString(
      ingredient.product
    ).toLowerCase();
    const product = products.find((item) => {
      if (id && String(item.id) === id) {
        return true;
      }
      return (
        name &&
        cleanString(item.name).toLowerCase() === name
      );
    });
    if (!product) {
      return;
    }
    const grams = num(
      ingredient.grams ?? ingredient.amount
    );
    const nutrition = calculateProductNutrition(
      product,
      grams
    );
    result.kcal += nutrition.kcal;
    result.protein += nutrition.protein;
    result.fat += nutrition.fat;
    result.carbs += nutrition.carbs;
    result.totalGrams += grams;
  });
  return result;
}
function formatNumber(value, digits = 1) {
  return num(value).toLocaleString("ru-RU", {
    maximumFractionDigits: digits,
  });
}
function getProductEmoji(product = {}) {
  const text = (
    cleanString(product.name) +
    " " +
    cleanString(product.category)
  ).toLowerCase();
  if (/куриц|индейк|говядин|свинин|мясо/.test(text)) return "🍗";
  if (/рыб|лосос|тунец|кревет|морепродукт/.test(text)) return "🐟";
  if (/молок|йогурт|кефир|творог|сыр|сливк/.test(text)) return "🥛";
  if (/яйц/.test(text)) return "🥚";
  if (/яблок|банан|груш|ягод|фрукт|апельсин/.test(text)) return "🍎";
  if (/овощ|огур|томат|помидор|морков|капуст|картоф/.test(text)) return "🥦";
  if (/рис|греч|овсян|макарон|мука|круп/.test(text)) return "🌾";
  if (/орех|миндал|арахис|семеч/.test(text)) return "🥜";
  if (/шоколад|какао|сахар|мёд|мед/.test(text)) return "🍫";
  if (/масло/.test(text)) return "🫒";
  return "🥗";
}
function getRecipeImage(recipe = {}) {
  return cleanString(
    recipe.image || recipe.image_url
  );
}
// ============================================================
// ЛОКАЛЬНОЕ ХРАНИЛИЩЕ
// ============================================================
async function readLocalData() {
  try {
    const raw = await AsyncStorage.getItem(
      STORAGE_KEYS.data
    );
    const data = safeJsonParse(raw, {});
    return data && typeof data === "object"
      ? data
      : {};
  } catch (error) {
    console.log("PaCook readLocalData:", error);
    return {};
  }
}
async function writeLocalData(data) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.data,
      JSON.stringify(data)
    );
    return true;
  } catch (error) {
    console.log("PaCook writeLocalData:", error);
    return false;
  }
}
async function readLocalProfile() {
  try {
    const raw = await AsyncStorage.getItem(
      STORAGE_KEYS.profile
    );
    return safeJsonParse(raw, {});
  } catch {
    return {};
  }
}
async function writeLocalProfile(profile) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify(profile)
    );
    return true;
  } catch (error) {
    console.log("PaCook writeLocalProfile:", error);
    return false;
  }
}
// ============================================================
// КОНЕЦ ЧАСТИ 1
// Следующая часть продолжит этот же файл.
// ============================================================

// ============================================================
// ЧАСТЬ 2 ИЗ 8
// Начальные данные, Supabase, авторизация и синхронизация
// ============================================================
// ============================================================
// НАЧАЛЬНЫЕ ПРОДУКТЫ
// Значения КБЖУ указаны приблизительно на 100 г.
// ============================================================
// ============================================================
// PACOOK — 150 ПРОДУКТОВ
// КБЖУ указано приблизительно на 100 г продукта
// ============================================================
const DEFAULT_PRODUCTS = [
  // МЯСО И ПТИЦА — 1–15
  { name: "Куриная грудка", category: "Мясо и птица", kcal: 120, protein: 23.1, fat: 2.6, carbs: 0 },
  { name: "Куриное бедро без кожи", category: "Мясо и птица", kcal: 144, protein: 19.7, fat: 7, carbs: 0 },
  { name: "Куриное филе индейки", category: "Мясо и птица", kcal: 114, protein: 23.7, fat: 1.5, carbs: 0 },
  { name: "Фарш из индейки", category: "Мясо и птица", kcal: 150, protein: 20, fat: 8, carbs: 0 },
  { name: "Говядина постная", category: "Мясо и птица", kcal: 187, protein: 20, fat: 12, carbs: 0 },
  { name: "Говяжий фарш", category: "Мясо и птица", kcal: 250, protein: 17, fat: 20, carbs: 0 },
  { name: "Телятина", category: "Мясо и птица", kcal: 172, protein: 20, fat: 10, carbs: 0 },
  { name: "Свинина постная", category: "Мясо и птица", kcal: 196, protein: 20, fat: 13, carbs: 0 },
  { name: "Свиной фарш", category: "Мясо и птица", kcal: 263, protein: 17, fat: 21, carbs: 0 },
  { name: "Куриные крылья", category: "Мясо и птица", kcal: 203, protein: 18, fat: 14, carbs: 0 },
  { name: "Куриная печень", category: "Мясо и птица", kcal: 119, protein: 17, fat: 5, carbs: 1 },
  { name: "Говяжья печень", category: "Мясо и птица", kcal: 135, protein: 20, fat: 4, carbs: 3.5 },
  { name: "Куриные сердечки", category: "Мясо и птица", kcal: 153, protein: 16, fat: 10, carbs: 0.8 },
  { name: "Ветчина", category: "Мясо и птица", kcal: 145, protein: 18, fat: 7, carbs: 1.5 },
  { name: "Бекон", category: "Мясо и птица", kcal: 417, protein: 12, fat: 42, carbs: 1.4 },
  // РЫБА И МОРЕПРОДУКТЫ — 16–30
  { name: "Лосось", category: "Рыба и морепродукты", kcal: 208, protein: 20, fat: 13, carbs: 0 },
  { name: "Форель", category: "Рыба и морепродукты", kcal: 148, protein: 20, fat: 7, carbs: 0 },
  { name: "Треска", category: "Рыба и морепродукты", kcal: 82, protein: 18, fat: 0.7, carbs: 0 },
  { name: "Минтай", category: "Рыба и морепродукты", kcal: 72, protein: 16, fat: 1, carbs: 0 },
  { name: "Тунец", category: "Рыба и морепродукты", kcal: 132, protein: 28, fat: 1, carbs: 0 },
  { name: "Скумбрия", category: "Рыба и морепродукты", kcal: 205, protein: 19, fat: 14, carbs: 0 },
  { name: "Сельдь", category: "Рыба и морепродукты", kcal: 158, protein: 18, fat: 9, carbs: 0 },
  { name: "Креветки", category: "Рыба и морепродукты", kcal: 99, protein: 24, fat: 0.3, carbs: 0.2 },
  { name: "Кальмар", category: "Рыба и морепродукты", kcal: 92, protein: 16, fat: 1.4, carbs: 3.1 },
  { name: "Мидии", category: "Рыба и морепродукты", kcal: 86, protein: 12, fat: 2.2, carbs: 3.7 },
  { name: "Крабовые палочки", category: "Рыба и морепродукты", kcal: 95, protein: 7, fat: 1, carbs: 15 },
  { name: "Сардины консервированные", category: "Рыба и морепродукты", kcal: 208, protein: 25, fat: 11, carbs: 0 },
  { name: "Печень трески", category: "Рыба и морепродукты", kcal: 613, protein: 4.2, fat: 65.7, carbs: 1.2 },
  { name: "Икра красная", category: "Рыба и морепродукты", kcal: 250, protein: 32, fat: 13, carbs: 0 },
  { name: "Кета", category: "Рыба и морепродукты", kcal: 127, protein: 20, fat: 5.6, carbs: 0 },
  // МОЛОЧНЫЕ ПРОДУКТЫ — 31–50
  { name: "Творог 0%", category: "Молочные продукты", kcal: 72, protein: 16, fat: 0.2, carbs: 1.8 },
  { name: "Творог 2%", category: "Молочные продукты", kcal: 103, protein: 18, fat: 2, carbs: 3.3 },
  { name: "Творог 5%", category: "Молочные продукты", kcal: 121, protein: 17, fat: 5, carbs: 1.8 },
  { name: "Творог 9%", category: "Молочные продукты", kcal: 159, protein: 16.7, fat: 9, carbs: 2 },
  { name: "Йогурт греческий 2%", category: "Молочные продукты", kcal: 73, protein: 10, fat: 2, carbs: 3.5 },
  { name: "Йогурт натуральный", category: "Молочные продукты", kcal: 60, protein: 4, fat: 3.2, carbs: 4.5 },
  { name: "Кефир 1%", category: "Молочные продукты", kcal: 40, protein: 3, fat: 1, carbs: 4 },
  { name: "Кефир 2.5%", category: "Молочные продукты", kcal: 53, protein: 3, fat: 2.5, carbs: 4 },
  { name: "Молоко 1.5%", category: "Молочные продукты", kcal: 44, protein: 3, fat: 1.5, carbs: 4.8 },
  { name: "Молоко 2.5%", category: "Молочные продукты", kcal: 52, protein: 3, fat: 2.5, carbs: 4.7 },
  { name: "Молоко 3.2%", category: "Молочные продукты", kcal: 60, protein: 3, fat: 3.2, carbs: 4.7 },
  { name: "Сливки 10%", category: "Молочные продукты", kcal: 119, protein: 3, fat: 10, carbs: 4 },
  { name: "Сливки 20%", category: "Молочные продукты", kcal: 206, protein: 2.8, fat: 20, carbs: 3.7 },
  { name: "Сметана 15%", category: "Молочные продукты", kcal: 162, protein: 2.6, fat: 15, carbs: 3.6 },
  { name: "Сметана 20%", category: "Молочные продукты", kcal: 206, protein: 2.8, fat: 20, carbs: 3.2 },
  { name: "Сыр моцарелла", category: "Молочные продукты", kcal: 280, protein: 28, fat: 17, carbs: 3.1 },
  { name: "Сыр российский", category: "Молочные продукты", kcal: 363, protein: 24, fat: 29, carbs: 0.3 },
  { name: "Сыр пармезан", category: "Молочные продукты", kcal: 392, protein: 35.8, fat: 25, carbs: 3.2 },
  { name: "Сыр сливочный", category: "Молочные продукты", kcal: 342, protein: 6, fat: 34, carbs: 4 },
  { name: "Масло сливочное", category: "Молочные продукты", kcal: 748, protein: 0.5, fat: 82.5, carbs: 0.8 },
  // ЯЙЦА — 51–55
  { name: "Яйцо куриное", category: "Яйца", kcal: 143, protein: 12.6, fat: 9.5, carbs: 0.7 },
  { name: "Яичный белок", category: "Яйца", kcal: 52, protein: 10.9, fat: 0.2, carbs: 0.7 },
  { name: "Яичный желток", category: "Яйца", kcal: 322, protein: 15.9, fat: 26.5, carbs: 3.6 },
  { name: "Перепелиные яйца", category: "Яйца", kcal: 158, protein: 13, fat: 11, carbs: 0.4 },
  { name: "Яичный порошок", category: "Яйца", kcal: 542, protein: 46, fat: 37, carbs: 4.5 },
  // КРУПЫ И МАКАРОНЫ — 56–75
  { name: "Овсяные хлопья", category: "Крупы и макароны", kcal: 366, protein: 12.3, fat: 6.1, carbs: 59.5 },
  { name: "Гречка сухая", category: "Крупы и макароны", kcal: 343, protein: 13.3, fat: 3.4, carbs: 71.5 },
  { name: "Рис белый сухой", category: "Крупы и макароны", kcal: 365, protein: 7.1, fat: 0.7, carbs: 80 },
  { name: "Рис бурый сухой", category: "Крупы и макароны", kcal: 370, protein: 7.9, fat: 2.9, carbs: 77.2 },
  { name: "Булгур сухой", category: "Крупы и макароны", kcal: 342, protein: 12.3, fat: 1.3, carbs: 75.9 },
  { name: "Кускус сухой", category: "Крупы и макароны", kcal: 376, protein: 12.8, fat: 0.6, carbs: 77.4 },
  { name: "Пшено сухое", category: "Крупы и макароны", kcal: 378, protein: 11, fat: 4.2, carbs: 72.9 },
  { name: "Перловка сухая", category: "Крупы и макароны", kcal: 352, protein: 9.9, fat: 1.2, carbs: 77.7 },
  { name: "Манная крупа", category: "Крупы и макароны", kcal: 333, protein: 10.3, fat: 1, carbs: 70.6 },
  { name: "Кукурузная крупа", category: "Крупы и макароны", kcal: 328, protein: 8.3, fat: 1.2, carbs: 71 },
  { name: "Макароны сухие", category: "Крупы и макароны", kcal: 371, protein: 13, fat: 1.5, carbs: 75 },
  { name: "Спагетти сухие", category: "Крупы и макароны", kcal: 371, protein: 13, fat: 1.5, carbs: 75 },
  { name: "Листы лазаньи", category: "Крупы и макароны", kcal: 350, protein: 12, fat: 2, carbs: 72 },
  { name: "Мука пшеничная", category: "Крупы и макароны", kcal: 364, protein: 10.3, fat: 1, carbs: 76.3 },
  { name: "Мука цельнозерновая", category: "Крупы и макароны", kcal: 340, protein: 13.2, fat: 2.5, carbs: 72 },
  { name: "Мука рисовая", category: "Крупы и макароны", kcal: 366, protein: 6, fat: 1.4, carbs: 80},
  { name: "Мука кукурузная", category: "Крупы и макароны", kcal: 361, protein: 6.9, fat: 3.9, carbs: 76.9 },
  { name: "Мука миндальная", category: "Крупы и макароны", kcal: 571, protein: 21.4, fat: 50, carbs: 21.7 },
  { name: "Крахмал кукурузный", category: "Крупы и макароны", kcal: 381, protein: 0.3, fat: 0.1, carbs: 91.3 },
  { name: "Хлеб цельнозерновой", category: "Крупы и макароны", kcal: 247, protein: 13, fat: 4.2, carbs: 41 },
  // ОВОЩИ — 76–95
  { name: "Картофель", category: "Овощи", kcal: 77, protein: 2, fat: 0.1, carbs: 17 },
  { name: "Батат", category: "Овощи", kcal: 86, protein: 1.6, fat: 0.1, carbs: 20.1 },
  { name: "Морковь", category: "Овощи", kcal: 41, protein: 0.9, fat: 0.2, carbs: 9.6 },
  { name: "Свёкла", category: "Овощи", kcal: 43, protein: 1.6, fat: 0.2, carbs: 9.6 },
  { name: "Лук репчатый", category: "Овощи", kcal: 40, protein: 1.1, fat: 0.1, carbs: 9.3 },
  { name: "Чеснок", category: "Овощи", kcal: 149, protein: 6.4, fat: 0.5, carbs: 33.1 },
  { name: "Томат", category: "Овощи", kcal: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
  { name: "Огурец", category: "Овощи", kcal: 15, protein: 0.7, fat: 0.1, carbs: 3.6 },
  { name: "Перец сладкий", category: "Овощи", kcal: 31, protein: 1, fat: 0.3, carbs: 6 },
  { name: "Кабачок", category: "Овощи", kcal: 17, protein: 1.2, fat: 0.3, carbs: 3.1 },
  { name: "Баклажан", category: "Овощи", kcal: 25, protein: 1, fat: 0.2, carbs: 5.9 },
  { name: "Брокколи", category: "Овощи", kcal: 34, protein: 2.8, fat: 0.4, carbs: 6.6 },
  { name: "Цветная капуста", category: "Овощи", kcal: 25, protein: 1.9, fat: 0.3, carbs: 5 },
  { name: "Белокочанная капуста", category: "Овощи", kcal: 25, protein: 1.3, fat: 0.1, carbs: 5.8 },
  { name: "Пекинская капуста", category: "Овощи", kcal: 16, protein: 1.2, fat: 0.2, carbs: 3.2 },
  { name: "Шпинат", category: "Овощи", kcal: 23, protein: 2.9, fat: 0.4, carbs: 3.6 },
  { name: "Листовой салат", category: "Овощи", kcal: 15, protein: 1.4, fat: 0.2, carbs: 2.9 },
  { name: "Грибы шампиньоны", category: "Овощи", kcal: 22, protein: 3.1, fat: 0.3, carbs: 3.3 },
  { name: "Кукуруза консервированная", category: "Овощи", kcal: 86, protein: 3.2, fat: 1.2, carbs: 16.3 },
  { name: "Горошек зелёный", category: "Овощи", kcal: 81, protein: 5.4, fat: 0.4, carbs: 14.5 },
  // ФРУКТЫ И ЯГОДЫ — 96–115
  { name: "Банан", category: "Фрукты и ягоды", kcal: 89, protein: 1.1, fat: 0.3, carbs: 22.8 },
  { name: "Яблоко", category: "Фрукты и ягоды", kcal: 52, protein: 0.3, fat: 0.2, carbs: 13.8 },
  { name: "Груша", category: "Фрукты и ягоды", kcal: 57, protein: 0.4, fat: 0.1, carbs: 15.2 },
  { name: "Апельсин", category: "Фрукты и ягоды", kcal: 47, protein: 0.9, fat: 0.1, carbs: 11.8 },
  { name: "Мандарин", category: "Фрукты и ягоды", kcal: 53, protein: 0.8, fat: 0.3, carbs: 13.3 },
  { name: "Лимон", category: "Фрукты и ягоды", kcal: 29, protein: 1.1, fat: 0.3, carbs: 9.3 },
  { name: "Киви", category: "Фрукты и ягоды", kcal: 61, protein: 1.1, fat: 0.5, carbs: 14.7 },
  { name: "Манго", category: "Фрукты и ягоды", kcal: 60, protein: 0.8, fat: 0.4, carbs: 15 },
  { name: "Ананас", category: "Фрукты и ягоды", kcal: 50, protein: 0.5, fat: 0.1, carbs: 13.1 },
  { name: "Виноград", category: "Фрукты и ягоды", kcal: 69, protein: 0.7, fat: 0.2, carbs: 18.1 },
  { name: "Клубника", category: "Фрукты и ягоды", kcal: 32, protein: 0.7, fat: 0.3, carbs: 7.7 },
  { name: "Малина", category: "Фрукты и ягоды", kcal: 52, protein: 1.2, fat: 0.7, carbs: 11.9 },
  { name: "Черника", category: "Фрукты и ягоды", kcal: 57, protein: 0.7, fat: 0.3, carbs: 14.5 },
  { name: "Голубика", category: "Фрукты и ягоды", kcal: 57, protein: 0.7, fat: 0.3, carbs: 14.5 },
  { name: "Вишня", category: "Фрукты и ягоды", kcal: 50, protein: 1, fat: 0.3, carbs: 12.2 },
  { name: "Черешня", category: "Фрукты и ягоды", kcal: 63, protein: 1.1, fat: 0.2, carbs: 16 },
  { name: "Персик", category: "Фрукты и ягоды", kcal: 39, protein: 0.9, fat: 0.3, carbs: 9.5 },
  { name: "Абрикос", category: "Фрукты и ягоды", kcal: 48, protein: 1.4, fat: 0.4, carbs: 11.1 },
  { name: "Арбуз", category: "Фрукты и ягоды", kcal: 30, protein: 0.6, fat: 0.2, carbs: 7.6 },
  { name: "Изюм", category: "Фрукты и ягоды", kcal: 299, protein: 3.1, fat: 0.5, carbs: 79.2 },
  // ОРЕХИ И СЕМЕНА — 116–125
  { name: "Миндаль", category: "Орехи и семена", kcal: 579, protein: 21.2, fat: 49.9, carbs: 21.6 },
  { name: "Грецкий орех", category: "Орехи и семена", kcal: 654, protein: 15.2, fat: 65.2, carbs: 13.7 },
  { name: "Кешью", category: "Орехи и семена", kcal: 553, protein: 18.2, fat: 43.9, carbs: 30.2 },
  { name: "Арахис", category: "Орехи и семена", kcal: 567, protein: 25.8, fat: 49.2, carbs: 16.1 },
  { name: "Фундук", category: "Орехи и семена", kcal: 628, protein: 15, fat: 60.8, carbs: 16.7 },
  { name: "Фисташки", category: "Орехи и семена", kcal: 562, protein: 20.2, fat: 45.3, carbs: 27.2 },
  { name: "Семена чиа", category: "Орехи и семена", kcal: 486, protein: 16.5, fat: 30.7, carbs: 42.1 },
  { name: "Семена льна", category: "Орехи и семена", kcal: 534, protein: 18.3, fat: 42.2, carbs: 28.9 },
  { name: "Семена подсолнечника", category: "Орехи и семена", kcal: 584, protein: 20.8, fat: 51.5, carbs: 20 },
  { name: "Кунжут", category: "Орехи и семена", kcal: 573, protein: 17.7, fat: 49.7, carbs: 23.4 },
  // МАСЛА И СОУСЫ — 126–135
  { name: "Оливковое масло", category: "Масла и соусы", kcal: 884, protein: 0, fat: 100, carbs: 0 },
  { name: "Подсолнечное масло", category: "Масла и соусы", kcal: 884, protein: 0, fat: 100, carbs: 0 },
  { name: "Кокосовое масло", category: "Масла и соусы", kcal: 892, protein: 0, fat: 99, carbs: 0 },
  { name: "Майонез", category: "Масла и соусы", kcal: 680, protein: 1, fat: 75, carbs: 1 },
  { name: "Кетчуп", category: "Масла и соусы", kcal: 112, protein: 1.3, fat: 0.2, carbs: 25 },
  { name: "Томатная паста", category: "Масла и соусы", kcal: 82, protein: 4.3, fat: 0.5, carbs: 18.9 },
  { name: "Соевый соус", category: "Масла и соусы", kcal: 53, protein: 8, fat: 0.6, carbs: 4.9 },
  { name: "Горчица", category: "Масла и соусы", kcal: 66, protein: 4.4, fat: 3.3, carbs: 5.8 },
  { name: "Мёд", category: "Масла и соусы", kcal: 304, protein: 0.3, fat: 0, carbs: 82.4 },
  { name: "Арахисовая паста", category: "Масла и соусы", kcal: 588, protein: 25, fat: 50, carbs: 20 },
  // САХАР, ВЫПЕЧКА И ПРОЧЕЕ — 136–150
  { name: "Сахар", category: "Сахар и выпечка", kcal: 387, protein: 0, fat: 0, carbs: 100 },
  { name: "Сахарная пудра", category: "Сахар и выпечка", kcal: 389, protein: 0, fat: 0, carbs: 100 },
  { name: "Какао-порошок", category: "Сахар и выпечка", kcal: 228, protein: 19.6, fat: 13.7, carbs: 57.9 },
  { name: "Шоколад тёмный", category: "Сахар и выпечка", kcal: 546, protein: 4.9, fat: 31.3, carbs: 61.2 },
  { name: "Шоколад молочный", category: "Сахар и выпечка", kcal: 535, protein: 7.6, fat: 29.7, carbs: 59.4 },
  { name: "Разрыхлитель теста", category: "Сахар и выпечка", kcal: 53, protein: 0, fat: 0, carbs: 27.7 },
  { name: "Дрожжи сухие", category: "Сахар и выпечка", kcal: 325, protein: 40, fat: 7, carbs: 41 },
  { name: "Ванильный сахар", category: "Сахар и выпечка", kcal: 400, protein: 0, fat: 0, carbs: 100 },
  { name: "Желатин", category: "Сахар и выпечка", kcal: 335, protein: 85.6, fat: 0.1, carbs: 0 },
  { name: "Кокосовая стружка", category: "Сахар и выпечка", kcal: 660, protein: 6.9, fat: 64.5, carbs: 23.7 },
  { name: "Лаваш", category: "Сахар и выпечка", kcal: 275, protein: 9.1, fat: 1.2, carbs: 56.2 },
  { name: "Тортилья", category: "Сахар и выпечка", kcal: 310, protein: 8.3, fat: 8.3, carbs: 50 },
  { name: "Хлеб белый", category: "Сахар и выпечка", kcal: 265, protein: 8.9, fat: 3.2, carbs: 49 },
  { name: "Сухари панировочные", category: "Сахар и выпечка", kcal: 395, protein: 13.4, fat: 5.3, carbs: 72.3 },
  { name: "Соль поваренная", category: "Специи и прочее", kcal: 0, protein: 0, fat: 0, carbs: 0 },
];
// Превращаем исходные данные в объекты продуктов PaCook.
// ID остаются одинаковыми при каждом запуске приложения.
function createDefaultProducts() {
  return DEFAULT_PRODUCTS.map((product, index) =>
    normalizeProduct({
      ...product,
      id: `default-product-${index + 1}`,
      fiber: 0,
      image: "",
      custom: false,
    })
  );
}
// ============================================================
// PACOOK — 15 РЕЦЕПТОВ
// Количество ингредиентов указано в граммах
// ============================================================
const DEFAULT_RECIPES = [
  {
    id: "default-recipe-1",
    title: "Нежные сырники",
    category: "Завтраки",
    description: "Мягкие сырники с творогом и золотистой корочкой.",
    servings: 2,
    prepTime: 10,
    cookTime: 15,
    pro: false,
    image: "",
    ingredients: [
      { product: "Творог 5%", grams: 300 },
      { product: "Яйцо куриное", grams: 50 },
      { product: "Мука пшеничная", grams: 30 },
      { product: "Сахар", grams: 20 },
    ],
    steps: [
      "Разомни творог и смешай с яйцом и сахаром.",
      "Добавь муку и перемешай до однородности.",
      "Сформируй сырники и слегка обваляй в муке.",
      "Обжарь на сковороде до золотистой корочки с обеих сторон.",
    ],
  },
  {
    id: "default-recipe-2",
    title: "Овсяноблин с бананом",
    category: "Завтраки",
    description: "Простой завтрак из овсянки, яйца и банана.",
    servings: 1,
    prepTime: 5,
    cookTime: 8,
    pro: false,
    image: "",
    ingredients: [
      { product: "Овсяные хлопья", grams: 40 },
      { product: "Яйцо куриное", grams: 50 },
      { product: "Молоко 2.5%", grams: 40 },
      { product: "Банан", grams: 80 },
    ],
    steps: [
      "Измельчи овсяные хлопья при необходимости.",
      "Смешай хлопья, яйцо и молоко.",
      "Вылей смесь на разогретую сковороду.",
      "Обжарь с двух сторон и подай с бананом.",
    ],
  },
  {
    id: "default-recipe-3",
    title: "Курица с гречкой",
    category: "Основные блюда",
    description: "Сытное домашнее блюдо на обед или ужин.",
    servings: 2,
    prepTime: 10,
    cookTime: 25,
    pro: false,
    image: "",
    ingredients: [
      { product: "Куриная грудка", grams: 300 },
      { product: "Гречка сухая", grams: 140 },
      { product: "Лук репчатый", grams: 70 },
      { product: "Морковь", grams: 80 },
      { product: "Оливковое масло", grams: 10 },
    ],
    steps: [
      "Промой гречку и отвари до готовности.",
      "Нарежь курицу и овощи.",
      "Обжарь овощи с небольшим количеством масла.",
      "Добавь курицу и готовь до полной готовности мяса.",
      "Подавай курицу с гречкой.",
    ],
  },
  {
    id: "default-recipe-4",
    title: "Паста с томатным соусом",
    category: "Основные блюда",
    description: "Классическая паста с томатами и чесноком.",
    servings: 2,
    prepTime: 5,
    cookTime: 20,
    pro: false,
    image: "",
    ingredients: [
      { product: "Макароны сухие", grams: 160 },
      { product: "Томат", grams: 200 },
      { product: "Томатная паста", grams: 30 },
      { product: "Чеснок", grams: 5 },
      { product: "Оливковое масло", grams: 10 },
    ],
    steps: [
      "Отвари макароны до состояния аль денте.",
      "Нарежь томаты и измельчи чеснок.",
      "Прогрей чеснок с маслом и добавь томаты.",
      "Добавь томатную пасту и немного воды от макарон.",
      "Смешай соус с пастой и подавай.",
    ],
  },
  {
    id: "default-recipe-5",
    title: "Домашние панкейки",
    category: "Завтраки",
    description: "Пышные панкейки для неспешного завтрака.",
    servings: 3,
    prepTime: 10,
    cookTime: 15,
    pro: false,
    image: "",
    ingredients: [
      { product: "Мука пшеничная", grams: 180 },
      { product: "Молоко 2.5%", grams: 200 },
      { product: "Яйцо куриное", grams: 50 },
      { product: "Сахар", grams: 25 },
      { product: "Разрыхлитель теста", grams: 5 },
    ],
    steps: [
      "Смешай муку, сахар и разрыхлитель.",
      "Добавь молоко и яйцо.",
      "Перемешай тесто до исчезновения крупных комочков.",
      "Выпекай небольшие панкейки на сухой сковороде.",
    ],
  },
  {
    id: "default-recipe-6",
    title: "Банановые маффины",
    category: "Выпечка",
    description: "Ароматные маффины с натуральной сладостью банана.",
    servings: 6,
    prepTime: 10,
    cookTime: 25,
    pro: false,
    image: "",
    ingredients: [
      { product: "Банан", grams: 200 },
      { product: "Яйцо куриное", grams: 100 },
      { product: "Мука пшеничная", grams: 160 },
      { product: "Сахар", grams: 40 },
      { product: "Масло сливочное", grams: 40 },
      { product: "Разрыхлитель теста", grams: 5 },
    ],
    steps: [
      "Разомни бананы вилкой.",
      "Добавь яйца, сахар и растопленное масло.",
      "Всыпь муку и разрыхлитель.",
      "Разложи тесто по формочкам.",
      "Выпекай при 180 °C примерно 20–25 минут.",
    ],
  },
  {
    id: "default-recipe-7",
    title: "Лосось с овощами",
    category: "Основные блюда",
    description: "Запечённая рыба с овощным гарниром.",
    servings: 2,
    prepTime: 10,
    cookTime: 25,
    pro: false,
    image: "",
    ingredients: [
      { product: "Лосось", grams: 300 },
      { product: "Брокколи", grams: 200 },
      { product: "Перец сладкий", grams: 120 },
      { product: "Оливковое масло", grams: 10 },
      { product: "Лимон", grams: 30 },
    ],
    steps: [
      "Разогрей духовку до 190 °C.",
      "Выложи рыбу и нарезанные овощи в форму.",
      "Добавь масло и лимонный сок.",
      "Запекай примерно 20–25 минут до готовности рыбы.",
    ],
  },
  {
    id: "default-recipe-8",
    title: "Яблочный пирог",
    category: "Выпечка",
    description: "Домашний пирог с яблоками и мягким тестом.",
    servings: 8,
    prepTime: 15,
    cookTime: 40,
    pro: false,
    image: "",
    ingredients: [
      { product: "Яблоко", grams: 400 },
      { product: "Яйцо куриное", grams: 150 },
      { product: "Мука пшеничная", grams: 180 },
      { product: "Сахар", grams: 100 },
      { product: "Масло сливочное", grams: 70 },
      { product: "Разрыхлитель теста", grams: 5 },
    ],
    steps: [
      "Взбей яйца с сахаром.",
      "Добавь растопленное масло, муку и разрыхлитель.",
      "Нарежь яблоки и вмешай в тесто.",
      "Переложи тесто в форму.",
      "Выпекай при 180 °C примерно 35–40 минут.",
    ],
  },
  {
    id: "default-recipe-9",
    title: "Домашние тефтели",
    category: "Основные блюда",
    description: "Сочные мясные тефтели с томатным соусом.",
    servings: 4,
    prepTime: 15,
    cookTime: 35,
    pro: false,
    image: "",
    ingredients: [
      { product: "Говяжий фарш", grams: 400 },
      { product: "Рис белый сухой", grams: 70 },
      { product: "Лук репчатый", grams: 100 },
      { product: "Томатная паста", grams: 40 },
      { product: "Морковь", grams: 100 },
    ],
    steps: [
      "Отвари рис до полуготовности.",
      "Смешай фарш с рисом и мелко нарезанным луком.",
      "Сформируй тефтели.",
      "Подготовь соус из моркови, томатной пасты и воды.",
      "Туши тефтели в соусе до полной готовности.",
    ],
  },
  {
    id: "default-recipe-10",
    title: "Салат с курицей",
    category: "Салаты",
    description: "Свежий салат с курицей и йогуртовой заправкой.",
    servings: 2,
    prepTime: 15,
    cookTime: 15,
    pro: false,
    image: "",
    ingredients: [
      { product: "Куриная грудка", grams: 200 },
      { product: "Огурец", grams: 150 },
      { product: "Томат", grams: 150 },
      { product: "Листовой салат", grams: 60 },
      { product: "Йогурт натуральный", grams: 60 },
    ],
    steps: [
      "Приготовь курицу и остуди её.",
      "Нарежь курицу и овощи.",
      "Порви салат руками.",
      "Заправь йогуртом и перемешай.",
    ],
  },
  {
    id: "default-recipe-11",
    title: "Домашний борщ",
    category: "Супы",
    description: "Наваристый домашний суп со свёклой и капустой.",
    servings: 6,
    prepTime: 20,
    cookTime: 70,
    pro: false,
    image: "",
    ingredients: [
      { product: "Говядина постная", grams: 300 },
      { product: "Картофель", grams: 300 },
      { product: "Свёкла", grams: 200 },
      { product: "Белокочанная капуста", grams: 250 },
      { product: "Морковь", grams: 100 },
      { product: "Лук репчатый", grams: 100 },
      { product: "Томатная паста", grams: 40 },
    ],
    steps: [
      "Отвари мясо до мягкости и получи бульон.",
      "Добавь нарезанный картофель.",
      "Отдельно потуши свёклу, морковь, лук и томатную пасту.",
      "Добавь овощную заправку и нашинкованную капусту.",
      "Вари до готовности овощей и дай супу настояться.",
    ],
  },
  {
    id: "default-recipe-12",
    title: "Домашняя лазанья",
    category: "Основные блюда",
    description: "Сытная лазанья с мясным соусом и сыром.",
    servings: 6,
    prepTime: 25,
    cookTime: 40,
    pro: false,
    image: "",
    ingredients: [
      { product: "Листы лазаньи", grams: 250 },
      { product: "Говяжий фарш", grams: 400 },
      { product: "Томатная паста", grams: 100 },
      { product: "Молоко 2.5%", grams: 400 },
      { product: "Мука пшеничная", grams: 30 },
      { product: "Масло сливочное", grams: 30 },
      { product: "Сыр моцарелла", grams: 200 },
    ],
    steps: [
      "Приготовь мясной соус из фарша и томатной пасты.",
      "Свари соус бешамель из масла, муки и молока.",
      "Выложи слоями листы лазаньи, мясной соус и бешамель.",
      "Посыпь верх моцареллой.",
      "Запекай при 180 °C примерно 35–40 минут.",
    ],
  },
  {
    id: "default-recipe-13",
    title: "Булочки с корицей",
    category: "Выпечка",
    description: "Мягкие сладкие булочки с ароматной коричной начинкой.",
    servings: 8,
    prepTime: 30,
    cookTime: 25,
    pro: false,
    image: "",
    ingredients: [
      { product: "Мука пшеничная", grams: 400 },
      { product: "Молоко 2.5%", grams: 200 },
      { product: "Сахар", grams: 100 },
      { product: "Масло сливочное", grams: 80 },
      { product: "Яйцо куриное", grams: 50 },
      { product: "Дрожжи сухие", grams: 7 },
    ],
    steps: [
      "Смешай тёплое молоко, дрожжи и немного сахара.",
      "Добавь яйцо, муку и часть мягкого масла.",
      "Замеси тесто и оставь в тепле до увеличения объёма.",
      "Раскатай тесто, смажь маслом и посыпь сахаром с корицей.",
      "Сверни рулет, нарежь булочки и дай им подняться.",
      "Выпекай при 180 °C примерно 20–25 минут.",
    ],
  },
  {
    id: "default-recipe-14",
    title: "Домашняя пицца",
    category: "Выпечка",
    description: "Пицца с томатным соусом, сыром и курицей.",
    servings: 4,
    prepTime: 25,
    cookTime: 20,
    pro: false,
    image: "",
    ingredients: [
      { product: "Мука пшеничная", grams: 300 },
      { product: "Вода", grams: 170 },
      { product: "Дрожжи сухие", grams: 5 },
      { product: "Томатная паста", grams: 60 },
      { product: "Сыр моцарелла", grams: 180 },
      { product: "Куриная грудка", grams: 150 },
      { product: "Томат", grams: 100 },
    ],
    steps: [
      "Замеси тесто из муки, воды и дрожжей.",
      "Оставь тесто подняться.",
      "Раскатай основу и смажь томатным соусом.",
      "Добавь сыр, приготовленную курицу и томаты.",
      "Выпекай при 220 °C примерно 12–20 минут.",
    ],
  },
  {
    id: "default-recipe-15",
    title: "Творожная запеканка",
    category: "Десерты",
    description: "Нежная творожная запеканка для завтрака или десерта.",
    servings: 4,
    prepTime: 10,
    cookTime: 40,
    pro: false,
    image: "",
    ingredients: [
      { product: "Творог 5%", grams: 500 },
      { product: "Яйцо куриное", grams: 100 },
      { product: "Сахар", grams: 50 },
      { product: "Манная крупа", grams: 40 },
      { product: "Йогурт натуральный", grams: 80 },
    ],
    steps: [
      "Смешай творог, яйца, сахар и йогурт.",
      "Добавь манную крупу и перемешай.",
      "Оставь смесь на 10 минут.",
      "Переложи в форму.",
      "Выпекай при 180 °C примерно 35–40 минут.",
    ],
  },
];
// Нормализация рецептов для приложения.
function createDefaultRecipes() {
  return DEFAULT_RECIPES.map((recipe) =>
    normalizeRecipe({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) => {
        const product = DEFAULT_PRODUCTS.find(
          (item) =>
            item.name.toLowerCase() ===
            ingredient.product.toLowerCase()
        );
        return {
          ...ingredient,
          productId: product
            ? `default-product-${DEFAULT_PRODUCTS.indexOf(product) + 1}`
            : "",
          product_id: product
            ? `default-product-${DEFAULT_PRODUCTS.indexOf(product) + 1}`
            : "",
          amount: ingredient.grams,
        };
      }),
    })
  );
}
// ============================================================
// КОНЕЦ БЛОКА НАЧАЛЬНЫХ ДАННЫХ
// ============================================================
// ============================================================
// НОРМАЛИЗАЦИЯ И НАЧАЛЬНЫЕ МАССИВЫ
// ============================================================
function createDefaultProducts() {
  return DEFAULT_PRODUCTS.map((row, index) =>
    normalizeProduct({
      id: `default-product-${index + 1}`,
      name: row[0],
      category: row[1],
      kcal: row[2],
      protein: row[3],
      fat: row[4],
      carbs: row[5],
      fiber: 0,
      image: "",
      custom: false,
    })
  );
}
function createDefaultRecipes() {
  return DEFAULT_RECIPES.map((recipe) =>
    normalizeRecipe({
      ...recipe,
      ingredients: recipe.ingredients.map((item) => ({
        ...item,
        productId: "",
        product_id: "",
        amount: item.grams,
      })),
    })
  );
}
// ============================================================
// SUPABASE: БЕЗОПАСНЫЕ ОПЕРАЦИИ
// ============================================================
async function getSupabaseProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.log("Supabase products:", error.message);
    return null;
  }
  return Array.isArray(data)
    ? data.map(normalizeProduct)
    : [];
}
async function getSupabaseRecipes() {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.log("Supabase recipes:", error.message);
    return null;
  }
  return Array.isArray(data)
    ? data.map(normalizeRecipe)
    : [];
}
async function saveSupabaseProduct(product) {
  const normalized = normalizeProduct(product);
  const { error } = await supabase
    .from("products")
    .upsert(
      {
        id: normalized.id,
        name: normalized.name,
        category: normalized.category,
        kcal: normalized.kcal,
        protein: normalized.protein,
        fat: normalized.fat,
        carbs: normalized.carbs,
        fiber: normalized.fiber,
        image: normalized.image,
      },
      { onConflict: "id" }
    );
  if (error) {
    console.log("Supabase save product:", error.message);
    return false;
  }
  return true;
}
async function removeSupabaseProduct(id) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);
  if (error) {
    console.log("Supabase delete product:", error.message);
    return false;
  }
  return true;
}
async function saveSupabaseRecipe(recipe) {
  const normalized = normalizeRecipe(recipe);
  const { error } = await supabase
    .from("recipes")
    .upsert(
      {
        id: normalized.id,
        title: normalized.title,
        category: normalized.category,
        description: normalized.description,
        image: normalized.image,
        ingredients: normalized.ingredients,
        steps: normalized.steps,
        servings: normalized.servings,
        pro: normalized.pro,
      },
      { onConflict: "id" }
    );
  if (error) {
    console.log("Supabase save recipe:", error.message);
    return false;
  }
  return true;
}
async function removeSupabaseRecipe(id) {
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);
  if (error) {
    console.log("Supabase delete recipe:", error.message);
    return false;
  }
  return true;
}
// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================
async function signInSupabase(email, password) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: cleanString(email).toLowerCase(),
      password,
    });
  if (error) {
    throw new Error(error.message);
  }
  return data.user;
}
async function signUpSupabase(email, password, name) {
  const { data, error } =
    await supabase.auth.signUp({
      email: cleanString(email).toLowerCase(),
      password,
      options: {
        data: {
          name: cleanString(name),
        },
        emailRedirectTo: PACOOK_URL,
      },
    });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
async function signOutSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}
// ============================================================
// ПРОФИЛЬ: ЗАГРУЗКА И СОХРАНЕНИЕ
// ============================================================
async function getSupabaseProfile(userId) {
  if (!userId) {
    return null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.log("Supabase profile:", error.message);
    return null;
  }
  if (!data) {
    return null;
  }
  return {
    id: data.id,
    name: data.name || "",
    avatarUrl: data.avatar_url || "",
    bio: data.bio || "",
    city: data.city || "",
    age: data.age || "",
    goal: data.goal || "",
  };
}
async function saveSupabaseProfile(userId, profile) {
  if (!userId) {
    return false;
  }
  // Используем только известные столбцы profiles:
  // id, name, avatar_url, updated_at.
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        name: cleanString(profile.name),
        avatar_url: cleanString(profile.avatarUrl),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (error) {
    console.log("Supabase save profile:", error.message);
    return false;
  }
  return true;
}
// ============================================================
// КОНЕЦ ЧАСТИ 2
// Продолжение — часть 3.
// ============================================================

// ============================================================
// ЧАСТЬ 3 ИЗ 8
// Состояние приложения, загрузка данных и общие операции
// ============================================================
export default function App() {
  // ----------------------------------------------------------
  // АВТОРИЗАЦИЯ
  // ----------------------------------------------------------
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  // ----------------------------------------------------------
  // ОСНОВНАЯ НАВИГАЦИЯ
  // ----------------------------------------------------------
  const [screen, setScreen] = useState("home");
  const [previousScreen, setPreviousScreen] = useState("home");
  // ----------------------------------------------------------
  // ДАННЫЕ
  // ----------------------------------------------------------
  const [products, setProducts] = useState(
    createDefaultProducts
  );
  const [recipes, setRecipes] = useState(
    createDefaultRecipes
  );
  const [favorites, setFavorites] = useState([]);
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [deletedRecipes, setDeletedRecipes] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState("");
  // ----------------------------------------------------------
  // ПРОДУКТЫ
  // ----------------------------------------------------------
  const [productsSearch, setProductsSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    category: "Другое",
    kcal: "",
    protein: "",
    fat: "",
    carbs: "",
    fiber: "",
    image: "",
  });
  // ----------------------------------------------------------
  // КАЛЬКУЛЯТОР КБЖУ
  // ----------------------------------------------------------
  const [calcProductSearch, setCalcProductSearch] = useState("");
  const [calcItems, setCalcItems] = useState([]);
  // ----------------------------------------------------------
  // РЕЦЕПТЫ
  // ----------------------------------------------------------
  const [recipesSearch, setRecipesSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [recipeForm, setRecipeForm] = useState({
    title: "",
    category: "Другое",
    description: "",
    image: "",
    ingredients: [
      {
        product: "",
        productId: "",
        grams: "",
        amount: "",
      },
    ],
    steps: [""],
    servings: 1,
    prepTime: 0,
    cookTime: 0,
    pro: false,
  });
  // ----------------------------------------------------------
  // ПРОФИЛЬ
  // ----------------------------------------------------------
  const [profile, setProfile] = useState({
    name: "PaCook User",
    avatarUrl: "",
    bio: "",
    city: "",
    age: "",
    goal: "",
  });
  const [profileForm, setProfileForm] = useState({
    name: "PaCook User",
    avatarUrl: "",
    bio: "",
    city: "",
    age: "",
    goal: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  // ----------------------------------------------------------
  // ОБЩИЕ НАСТРОЙКИ
  // ----------------------------------------------------------
  const [settings, setSettings] = useState({
    calorieGoal: 2000,
    proteinGoal: 120,
    fatGoal: 65,
    carbsGoal: 250,
    theme: "light",
  });
  const [showAuthorTools, setShowAuthorTools] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // ----------------------------------------------------------
  // ДНЕВНИК
  // Базовые состояния; интерфейс и операции добавим далее.
  // ----------------------------------------------------------
  const [diary, setDiary] = useState({});
  const [diaryDate, setDiaryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [diaryForm, setDiaryForm] = useState({
    title: "",
    meal: "Завтрак",
    grams: "100",
    kcal: "",
    protein: "",
    fat: "",
    carbs: "",
  });
  const [editingDiaryId, setEditingDiaryId] = useState(null);
  // ----------------------------------------------------------
  // ВЫЧИСЛЯЕМЫЕ СПИСКИ
  // ----------------------------------------------------------
  const filteredProducts = useMemo(() => {
    const query = cleanString(productsSearch).toLowerCase();
    return products.filter((product) => {
      if (!product || !product.name) {
        return false;
      }
      return (
        !query ||
        product.name.toLowerCase().includes(query) ||
        cleanString(product.category).toLowerCase().includes(query)
      );
    });
  }, [products, productsSearch]);
  const filteredRecipes = useMemo(() => {
    const query = cleanString(recipesSearch).toLowerCase();
    return recipes.filter((recipe) => {
      if (!recipe || !recipe.title) {
        return false;
      }
      return (
        !query ||
        recipe.title.toLowerCase().includes(query) ||
        cleanString(recipe.category).toLowerCase().includes(query) ||
        cleanString(recipe.description).toLowerCase().includes(query)
      );
    });
  }, [recipes, recipesSearch]);
  const favoriteRecipes = useMemo(() => {
    return recipes.filter((recipe) =>
      favorites.includes(String(recipe.id))
    );
  }, [recipes, favorites]);
  const calculatorTotals = useMemo(() => {
    return calcItems.reduce(
      (totals, item) => {
        const product = products.find(
          (entry) => String(entry.id) === String(item.productId)
        );
        if (!product) {
          return totals;
        }
        const nutrition = calculateProductNutrition(
          product,
          item.grams
        );
        totals.kcal += nutrition.kcal;
        totals.protein += nutrition.protein;
        totals.fat += nutrition.fat;
        totals.carbs += nutrition.carbs;
        totals.grams += num(item.grams);
        return totals;
      },
      {
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        grams: 0,
      }
    );
  }, [calcItems, products]);
  // ----------------------------------------------------------
  // ЛОКАЛЬНОЕ СОХРАНЕНИЕ
  // ----------------------------------------------------------
  const persistData = useCallback(
    async (overrides = {}) => {
      const payload = {
        products,
        recipes,
        favorites,
        deletedProducts,
        deletedRecipes,
        diary,
        settings,
        ...overrides,
      };
      return writeLocalData(payload);
    },
    [
      products,
      recipes,
      favorites,
      deletedProducts,
      deletedRecipes,
      diary,
      settings,
    ]
  );
  // ----------------------------------------------------------
  // ЗАГРУЗКА ДАННЫХ ИЗ ТЕЛЕФОНА
  // ----------------------------------------------------------
  const loadLocalData = useCallback(async () => {
    const local = await readLocalData();
    const localProducts = Array.isArray(local.products)
      ? local.products.map(normalizeProduct)
      : createDefaultProducts();
    const localRecipes = Array.isArray(local.recipes)
      ? local.recipes.map(normalizeRecipe)
      : createDefaultRecipes();
    setProducts(localProducts);
    setRecipes(localRecipes);
    setFavorites(
      Array.isArray(local.favorites)
        ? local.favorites.map(String)
        : []
    );
    setDeletedProducts(
      Array.isArray(local.deletedProducts)
        ? local.deletedProducts.map(String)
        : []
    );
    setDeletedRecipes(
      Array.isArray(local.deletedRecipes)
        ? local.deletedRecipes.map(String)
        : []
    );
    setDiary(
      local.diary && typeof local.diary === "object"
        ? local.diary
        : {}
    );
    setSettings((current) => ({
      ...current,
      ...(local.settings || {}),
    }));
    const localProfile = await readLocalProfile();
    if (localProfile && typeof localProfile === "object") {
      const nextProfile = {
        name: cleanString(localProfile.name) || "PaCook User",
        avatarUrl: cleanString(
          localProfile.avatarUrl || localProfile.avatar_url
        ),
        bio: cleanString(localProfile.bio),
        city: cleanString(localProfile.city),
        age: cleanString(localProfile.age),
        goal: cleanString(localProfile.goal),
      };
      setProfile(nextProfile);
      setProfileForm(nextProfile);
    }
    return {
      products: localProducts,
      recipes: localRecipes,
      deletedProducts: Array.isArray(local.deletedProducts)
        ? local.deletedProducts.map(String)
        : [],
      deletedRecipes: Array.isArray(local.deletedRecipes)
        ? local.deletedRecipes.map(String)
        : [],
    };
  }, []);
  // ----------------------------------------------------------
  // СИНХРОНИЗАЦИЯ С SUPABASE
  // ----------------------------------------------------------
  const syncFromSupabase = useCallback(async () => {
    setSyncLoading(true);
    setSyncError("");
    try {
      const [
        remoteProducts,
        remoteRecipes,
      ] = await Promise.all([
        getSupabaseProducts(),
        getSupabaseRecipes(),
      ]);
      if (remoteProducts !== null) {
        setProducts((current) => {
          const deleted = new Set(deletedProducts);
          const remote = remoteProducts.filter(
            (item) => !deleted.has(String(item.id))
          );
          const localCustom = current.filter(
            (item) =>
              item.custom &&
              !remote.some(
                (remoteItem) =>
                  String(remoteItem.id) === String(item.id)
              ) &&
              !deleted.has(String(item.id))
          );
          const combined = [
            ...remote,
            ...localCustom,
          ];
          return combined.length
            ? combined
            : createDefaultProducts();
        });
      }
      if (remoteRecipes !== null) {
        setRecipes((current) => {
          const deleted = new Set(deletedRecipes);
          const remote = remoteRecipes.filter(
            (item) => !deleted.has(String(item.id))
          );
          const localCustom = current.filter(
            (item) =>
              item.custom &&
              !remote.some(
                (remoteItem) =>
                  String(remoteItem.id) === String(item.id)
              ) &&
              !deleted.has(String(item.id))
          );
          const combined = [
            ...remote,
            ...localCustom,
          ];
          return combined.length
            ? combined
            : createDefaultRecipes();
        });
      }
    } catch (error) {
      console.log("PaCook sync error:", error);
      setSyncError(
        "Не удалось синхронизировать данные. Локальные данные сохранены."
      );
    } finally {
      setSyncLoading(false);
    }
  }, [deletedProducts, deletedRecipes]);
  // ----------------------------------------------------------
  // ВОССТАНОВЛЕНИЕ СЕССИИ
  // ----------------------------------------------------------
  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.log("PaCook restore session:", error.message);
        }
        if (active) {
          setAuthUser(session?.user || null);
        }
      } catch (error) {
        console.log("PaCook session error:", error);
      } finally {
        if (active) {
          setAuthChecked(true);
        }
      }
    };
    restoreSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) {
          setAuthUser(session?.user || null);
        }
      }
    );
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);
  // ----------------------------------------------------------
  // ПЕРВИЧНАЯ ЗАГРУЗКА
  // ----------------------------------------------------------
  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        await loadLocalData();
      } catch (error) {
        console.log("PaCook initialization:", error);
      } finally {
        if (active) {
          setDataLoaded(true);
        }
      }
    };
    initialize();
    return () => {
      active = false;
    };
  }, [loadLocalData]);
  // ----------------------------------------------------------
  // СИНХРОНИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ
  // ----------------------------------------------------------
  useEffect(() => {
    if (!authChecked || !dataLoaded || !authUser) {
      return;
    }
    syncFromSupabase();
  }, [
    authChecked,
    dataLoaded,
    authUser?.id,
    syncFromSupabase,
  ]);
  // ----------------------------------------------------------
  // АВТОСОХРАНЕНИЕ
  // ----------------------------------------------------------
  useEffect(() => {
    if (!dataLoaded) {
      return;
    }
    persistData();
  }, [
    dataLoaded,
    products,
    recipes,
    favorites,
    deletedProducts,
    deletedRecipes,
    diary,
    settings,
    persistData,
  ]);
  // ==========================================================
  // КОНЕЦ ЧАСТИ 3
  // Следующая часть продолжит компонент App.
  // ==========================================================

  // ==========================================================
  // ЧАСТЬ 4 ИЗ 8
  // Авторизация, навигация, продукты и калькулятор
  // ==========================================================
  // ----------------------------------------------------------
  // НАВИГАЦИЯ
  // ----------------------------------------------------------
  function navigateTo(nextScreen) {
    setPreviousScreen(screen);
    setScreen(nextScreen);
  }
  function goHome() {
    setScreen("home");
  }
  function goProducts() {
    setScreen("products");
  }
  function goRecipes() {
    setScreen("recipes");
  }
  function goProfile() {
    setScreen("profile");
  }
  function openProduct(product) {
    if (!product) {
      return;
    }
    setSelectedProduct(product);
    navigateTo("product");
  }
  function closeProduct() {
    setSelectedProduct(null);
    setScreen("products");
  }
  function openRecipe(recipe) {
    if (!recipe) {
      return;
    }
    setSelectedRecipe(recipe);
    navigateTo("recipeDetail");
  }
  function closeRecipe() {
    setSelectedRecipe(null);
    setScreen("recipes");
  }
  // ----------------------------------------------------------
  // ВХОД
  // ----------------------------------------------------------
  async function handleLogin() {
    const email = cleanString(authEmail).toLowerCase();
    if (!email || !cleanString(authPassword)) {
      setAuthError("Введи почту и пароль.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      await signInSupabase(email, authPassword);
      setScreen("home");
    } catch (error) {
      setAuthError(
        error?.message || "Не удалось войти в аккаунт."
      );
    } finally {
      setAuthLoading(false);
    }
  }
  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  async function handleRegister() {
    const email = cleanString(authEmail).toLowerCase();
    const password = authPassword;
    const name = cleanString(authName);
    if (!name) {
      setAuthError("Введи имя.");
      return;
    }
    if (!email || !password) {
      setAuthError("Введи почту и пароль.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Пароль должен содержать минимум 6 символов.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await signUpSupabase(
        email,
        password,
        name
      );
      if (!result?.session) {
        setAuthError(
          "Регистрация создана. Проверь почту и подтверди аккаунт, если это требуется."
        );
      } else {
        setScreen("home");
      }
    } catch (error) {
      setAuthError(
        error?.message || "Не удалось зарегистрироваться."
      );
    } finally {
      setAuthLoading(false);
    }
  }
  // ----------------------------------------------------------
  // ВЫХОД
  // ----------------------------------------------------------
  async function logoutUser() {
    try {
      await signOutSupabase();
      setAuthUser(null);
      setScreen("auth");
      setAuthPassword("");
      setAuthError("");
    } catch (error) {
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось выйти из аккаунта."
      );
    }
  }
  // ----------------------------------------------------------
  // ДОБАВЛЕНИЕ ПРОДУКТА В КАЛЬКУЛЯТОР
  // ----------------------------------------------------------
  function addProductToCalculator(product) {
    if (!product) {
      return;
    }
    setCalcItems((current) => {
      const existing = current.find(
        (item) =>
          String(item.productId) === String(product.id)
      );
      if (existing) {
        return current.map((item) =>
          String(item.productId) === String(product.id)
            ? {
                ...item,
                grams: num(item.grams) + 100,
              }
            : item
        );
      }
      return [
        ...current,
        {
          id: makeId("calc"),
          productId: String(product.id),
          grams: 100,
        },
      ];
    });
    setCalcProductSearch("");
  }
  function updateCalculatorGrams(itemId, value) {
    const normalized = String(value).replace(",", ".");
    if (normalized !== "" && !/^\d*\.?\d*$/.test(normalized)) {
      return;
    }
    setCalcItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              grams: normalized === "" ? "" : normalized,
            }
          : item
      )
    );
  }
  function removeCalculatorItem(itemId) {
    setCalcItems((current) =>
      current.filter((item) => item.id !== itemId)
    );
  }
  function clearCalculator() {
    setCalcItems([]);
    setCalcProductSearch("");
  }
  // ----------------------------------------------------------
  // СБРОС ФОРМЫ ПРОДУКТА
  // ----------------------------------------------------------
  function resetProductForm() {
    setEditingProductId(null);
    setProductForm({
      name: "",
      category: "Другое",
      kcal: "",
      protein: "",
      fat: "",
      carbs: "",
      fiber: "",
      image: "",
    });
  }
  // ----------------------------------------------------------
  // РЕДАКТИРОВАНИЕ ПРОДУКТА
  // ----------------------------------------------------------
  function startEditProduct(product) {
    if (!product) {
      return;
    }
    setEditingProductId(String(product.id));
    setProductForm({
      name: product.name || "",
      category: product.category || "Другое",
      kcal: String(product.kcal ?? ""),
      protein: String(product.protein ?? ""),
      fat: String(product.fat ?? ""),
      carbs: String(product.carbs ?? ""),
      fiber: String(product.fiber ?? ""),
      image: product.image || "",
    });
    setScreen("authorProduct");
  }
  // ----------------------------------------------------------
  // СОХРАНЕНИЕ ПРОДУКТА
  // ----------------------------------------------------------
  async function saveProduct() {
    const name = cleanString(productForm.name);
    if (!name) {
      Alert.alert("Проверь данные", "Введи название продукта.");
      return;
    }
    const oldProduct = products.find(
      (item) =>
        String(item.id) === String(editingProductId)
    );
    const duplicate = products.find(
      (item) =>
        cleanString(item.name).toLowerCase() ===
          name.toLowerCase() &&
        String(item.id) !== String(editingProductId)
    );
    if (duplicate) {
      Alert.alert(
        "Такой продукт уже есть",
        "Измени название или открой существующий продукт для редактирования."
      );
      return;
    }
    const product = normalizeProduct({
      ...oldProduct,
      id: editingProductId || makeId("product"),
      name,
      category: cleanString(productForm.category) || "Другое",
      kcal: num(productForm.kcal),
      protein: num(productForm.protein),
      fat: num(productForm.fat),
      carbs: num(productForm.carbs),
      fiber: num(productForm.fiber),
      image: cleanString(productForm.image),
      custom: true,
      author_id: authUser?.id || null,
      updated_at: new Date().toISOString(),
    });
    const nextProducts = oldProduct
      ? products.map((item) =>
          String(item.id) === String(oldProduct.id)
            ? product
            : item
        )
      : [...products, product];
    setProducts(nextProducts);
    await persistData({
      products: nextProducts,
    });
    if (authUser) {
      const saved = await saveSupabaseProduct(product);
      if (!saved) {
        Alert.alert(
          "Сохранено на устройстве",
          "Не удалось сохранить продукт в облако. Проверь схему таблицы products и права доступа Supabase."
        );
      }
    }
    resetProductForm();
    setSelectedProduct(product);
    setScreen("product");
  }
  // ----------------------------------------------------------
  // УДАЛЕНИЕ ПРОДУКТА
  // ----------------------------------------------------------
  function deleteProduct(product) {
    if (!product) {
      return;
    }
    Alert.alert(
      "Удалить продукт?",
      `«${product.name}» будет удалён из списка на этом устройстве.`,
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            const id = String(product.id);
            const nextProducts = products.filter(
              (item) => String(item.id) !== id
            );
            const nextDeleted = deletedProducts.includes(id)
              ? deletedProducts
              : [...deletedProducts, id];
            setProducts(nextProducts);
            setDeletedProducts(nextDeleted);
            setCalcItems((current) =>
              current.filter(
                (item) => String(item.productId) !== id
              )
            );
            await persistData({
              products: nextProducts,
              deletedProducts: nextDeleted,
            });
            if (authUser) {
              await removeSupabaseProduct(id);
            }
            setSelectedProduct(null);
            setScreen("products");
          },
        },
      ]
    );
  }
  // ----------------------------------------------------------
  // СОЗДАНИЕ ПРОДУКТА
  // ----------------------------------------------------------
  function startCreateProduct() {
    resetProductForm();
    setScreen("authorProduct");
  }
  // ----------------------------------------------------------
  // КОНЕЦ ЧАСТИ 4
  // Часть 5 продолжит этот же компонент App().
  // ==========================================================

  // ==========================================================
  // ЧАСТЬ 5 ИЗ 8
  // РЕЦЕПТЫ, ИЗБРАННОЕ, ИНГРЕДИЕНТЫ И ПИТАТЕЛЬНОСТЬ
  // ==========================================================
  // ----------------------------------------------------------
  // ОТКРЫТИЕ СОЗДАНИЯ РЕЦЕПТА
  // ----------------------------------------------------------
  function startCreateRecipe() {
    setEditingRecipeId(null);
    setSelectedRecipe(null);
    setRecipeForm({
      title: "",
      category: "Основное блюдо",
      description: "",
      image: "",
      ingredients: [
        {
          product: "",
          productId: "",
          product_id: "",
          grams: "",
          amount: "",
        },
      ],
      steps: [""],
      pro: false,
      servings: 2,
      prepTime: 15,
      cookTime: 20,
    });
    setScreen("authorRecipe");
  }
  // ----------------------------------------------------------
  // РЕДАКТИРОВАНИЕ РЕЦЕПТА
  // ----------------------------------------------------------
  function startEditRecipe(recipe) {
    if (!recipe) {
      return;
    }
    const sourceIngredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [];
    const normalizedIngredients = sourceIngredients.map(
      (item) => {
        const productId = String(
          item?.productId ||
          item?.product_id ||
          item?.product?.id ||
          ""
        ).trim();
        const productName = String(
          typeof item?.product === "string"
            ? item.product
            : item?.productName || ""
        ).trim();
        const matchedProduct = products.find(
          (product) =>
            String(product.id) === productId
        );
        const grams = num(
          item?.grams ??
          item?.amount ??
          item?.weight ??
          0
        );
        return {
          product:
            productName ||
            matchedProduct?.name ||
            "",
          productId,
          product_id: productId,
          grams: String(grams || ""),
          amount: String(grams || ""),
        };
      }
    );
    setEditingRecipeId(String(recipe.id));
    setSelectedRecipe(recipe);
    setRecipeForm({
      title: recipe.title || recipe.name || "",
      category: recipe.category || "Другое",
      description: recipe.description || "",
      image: recipe.image || recipe.image_url || "",
      ingredients: normalizedIngredients.length
        ? normalizedIngredients
        : [
            {
              product: "",
              productId: "",
              product_id: "",
              grams: "",
              amount: "",
            },
          ],
      steps: Array.isArray(recipe.steps) && recipe.steps.length
        ? recipe.steps.map((step) =>
            typeof step === "string"
              ? step
              : String(step?.text || "")
          )
        : [""],
      pro: Boolean(recipe.pro),
      servings: Math.max(1, num(recipe.servings) || 1),
      prepTime: num(recipe.prepTime ?? recipe.prep_time),
      cookTime: num(recipe.cookTime ?? recipe.cook_time),
    });
    setScreen("authorRecipe");
  }
  // ----------------------------------------------------------
  // ОБНОВЛЕНИЕ ПОЛЕЙ РЕЦЕПТА
  // ----------------------------------------------------------
  function updateRecipeField(field, value) {
    setRecipeForm((current) => ({
      ...current,
      [field]: value,
    }));
  }
  // ----------------------------------------------------------
  // ДОБАВЛЕНИЕ ИНГРЕДИЕНТА
  // ----------------------------------------------------------
  function addRecipeIngredient() {
    setRecipeForm((current) => ({
      ...current,
      ingredients: [
        ...(Array.isArray(current.ingredients)
          ? current.ingredients
          : []),
        {
          product: "",
          productId: "",
          product_id: "",
          grams: "",
          amount: "",
        },
      ],
    }));
  }
  // ----------------------------------------------------------
  // ИЗМЕНЕНИЕ ИНГРЕДИЕНТА
  // ----------------------------------------------------------
  function updateRecipeIngredient(index, field, value) {
    setRecipeForm((current) => {
      const ingredients = [
        ...(Array.isArray(current.ingredients)
          ? current.ingredients
          : []),
      ];
      const previous = ingredients[index] || {
        product: "",
        productId: "",
        product_id: "",
        grams: "",
        amount: "",
      };
      const updated = {
        ...previous,
        [field]: value,
      };
      if (field === "productId") {
        const product = products.find(
          (item) => String(item.id) === String(value)
        );
        updated.productId = String(value || "");
        updated.product_id = String(value || "");
        updated.product = product?.name || "";
      }
      if (field === "product") {
        const product = products.find(
          (item) =>
            item.name.toLowerCase() ===
            String(value).trim().toLowerCase()
        );
        updated.product = value;
        if (product) {
          updated.productId = String(product.id);
          updated.product_id = String(product.id);
        } else {
          updated.productId = "";
          updated.product_id = "";
        }
      }
      if (field === "grams" || field === "amount") {
        updated.grams = value;
        updated.amount = value;
      }
      ingredients[index] = updated;
      return {
        ...current,
        ingredients,
      };
    });
  }
  // ----------------------------------------------------------
  // УДАЛЕНИЕ ИНГРЕДИЕНТА
  // ----------------------------------------------------------
  function removeRecipeIngredient(index) {
    setRecipeForm((current) => {
      const ingredients = (
        Array.isArray(current.ingredients)
          ? current.ingredients
          : []
      ).filter((_, ingredientIndex) => ingredientIndex !== index);
      return {
        ...current,
        ingredients: ingredients.length
          ? ingredients
          : [
              {
                product: "",
                productId: "",
                product_id: "",
                grams: "",
                amount: "",
              },
            ],
      };
    });
  }
  // ----------------------------------------------------------
  // ШАГИ ПРИГОТОВЛЕНИЯ
  // ----------------------------------------------------------
  function addRecipeStep() {
    setRecipeForm((current) => ({
      ...current,
      steps: [
        ...(Array.isArray(current.steps) ? current.steps : []),
        "",
      ],
    }));
  }
  function updateRecipeStep(index, value) {
    setRecipeForm((current) => {
      const steps = [
        ...(Array.isArray(current.steps) ? current.steps : []),
      ];
      steps[index] = value;
      return {
        ...current,
        steps,
      };
    });
  }
  function removeRecipeStep(index) {
    setRecipeForm((current) => {
      const steps = (
        Array.isArray(current.steps) ? current.steps : []
      ).filter((_, stepIndex) => stepIndex !== index);
      return {
        ...current,
        steps: steps.length ? steps : [""],
      };
    });
  }
  // ----------------------------------------------------------
  // РАСЧЁТ КБЖУ РЕЦЕПТА
  // ----------------------------------------------------------
  function getRecipeNutrition(recipe) {
    return calculateRecipeNutrition(
      recipe,
      products
    );
  }
  function getRecipeIngredientsWithProducts(recipe) {
    const ingredients = Array.isArray(recipe?.ingredients)
      ? recipe.ingredients
      : [];
    return ingredients.map((ingredient) => {
      const productId = String(
        ingredient?.productId ||
        ingredient?.product_id ||
        ingredient?.product?.id ||
        ""
      );
      const productName = String(
        typeof ingredient?.product === "string"
          ? ingredient.product
          : ingredient?.productName || ""
      );
      const product = products.find(
        (item) =>
          (productId && String(item.id) === productId) ||
          (
            productName &&
            item.name.toLowerCase() ===
              productName.toLowerCase()
          )
      );
      const grams = num(
        ingredient?.grams ??
        ingredient?.amount ??
        ingredient?.weight ??
        0
      );
      const nutrition = product
        ? calculateProductNutrition(product, grams)
        : {
            kcal: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            fiber: 0,
          };
      return {
        ...ingredient,
        product,
        productName: product?.name || productName || "Продукт не найден",
        grams,
        nutrition,
      };
    });
  }
  // ----------------------------------------------------------
  // ИЗБРАННОЕ
  // ----------------------------------------------------------
  async function toggleFavorite(recipe) {
    if (!recipe) {
      return;
    }
    const recipeId = String(recipe.id);
    const nextFavorites = favorites.includes(recipeId)
      ? favorites.filter((id) => id !== recipeId)
      : [...favorites, recipeId];
    setFavorites(nextFavorites);
    await persistData({
      favorites: nextFavorites,
    });
  }
  function isFavorite(recipe) {
    return Boolean(
      recipe &&
      favorites.includes(String(recipe.id))
    );
  }
  // ----------------------------------------------------------
  // СОХРАНЕНИЕ РЕЦЕПТА
  // ----------------------------------------------------------
  async function saveRecipe() {
    const title = cleanString(recipeForm.title);
    if (!title) {
      Alert.alert("Проверь данные", "Введи название рецепта.");
      return;
    }
    const rawIngredients = Array.isArray(recipeForm.ingredients)
      ? recipeForm.ingredients
      : [];
    const ingredients = rawIngredients
      .map((item) => {
        const productId = String(
          item?.productId || item?.product_id || ""
        ).trim();
        const productName = cleanString(item?.product);
        const product = products.find(
          (entry) =>
            (productId && String(entry.id) === productId) ||
            (
              productName &&
              entry.name.toLowerCase() === productName.toLowerCase()
            )
        );
        const grams = num(item?.grams ?? item?.amount);
        return {
          product: product?.name || productName,
          productId: product ? String(product.id) : productId,
          product_id: product ? String(product.id) : productId,
          grams,
          amount: grams,
        };
      })
      .filter((item) => item.product || item.productId);
    if (!ingredients.length) {
      Alert.alert(
        "Добавь ингредиенты",
        "У рецепта должен быть хотя бы один ингредиент."
      );
      return;
    }
    const steps = (
      Array.isArray(recipeForm.steps) ? recipeForm.steps : []
    )
      .map((step) => cleanString(step))
      .filter(Boolean);
    if (!steps.length) {
      Alert.alert(
        "Добавь шаги",
        "Напиши хотя бы один шаг приготовления."
      );
      return;
    }
    const oldRecipe = recipes.find(
      (item) =>
        String(item.id) === String(editingRecipeId)
    );
    const recipe = normalizeRecipe({
      ...oldRecipe,
      id: editingRecipeId || makeId("recipe"),
      title,
      name: title,
      category: cleanString(recipeForm.category) || "Другое",
      description: cleanString(recipeForm.description),
      image: cleanString(recipeForm.image),
      ingredients,
      steps,
      servings: Math.max(1, num(recipeForm.servings) || 1),
      prepTime: num(recipeForm.prepTime),
      cookTime: num(recipeForm.cookTime),
      pro: Boolean(recipeForm.pro),
      author_id: authUser?.id || null,
      updated_at: new Date().toISOString(),
    });
    const nextRecipes = oldRecipe
      ? recipes.map((item) =>
          String(item.id) === String(oldRecipe.id)
            ? recipe
            : item
        )
      : [recipe, ...recipes];
    setRecipes(nextRecipes);
    await persistData({
      recipes: nextRecipes,
    });
    if (authUser) {
      try {
        const saved = await saveSupabaseRecipe(recipe);
        if (!saved) {
          Alert.alert(
            "Сохранено на устройстве",
            "Не удалось сохранить рецепт в Supabase. Проверь таблицу recipes и её политики доступа."
          );
        }
      } catch (error) {
        Alert.alert(
          "Облачное сохранение не удалось",
          error?.message || "Рецепт остался на этом устройстве."
        );
      }
    }
    setEditingRecipeId(null);
    setSelectedRecipe(recipe);
    setScreen("recipeDetail");
  }
  // ----------------------------------------------------------
  // УДАЛЕНИЕ РЕЦЕПТА
  // ----------------------------------------------------------
  function deleteRecipe(recipe) {
    if (!recipe) {
      return;
    }
    Alert.alert(
      "Удалить рецепт?",
      `«${recipe.title || recipe.name}» будет удалён из списка.`,
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            const id = String(recipe.id);
            const nextRecipes = recipes.filter(
              (item) => String(item.id) !== id
            );
            const nextDeleted = deletedRecipes.includes(id)
              ? deletedRecipes
              : [...deletedRecipes, id];
            const nextFavorites = favorites.filter(
              (favoriteId) => String(favoriteId) !== id
            );
            setRecipes(nextRecipes);
            setDeletedRecipes(nextDeleted);
            setFavorites(nextFavorites);
            setSelectedRecipe(null);
            await persistData({
              recipes: nextRecipes,
              deletedRecipes: nextDeleted,
              favorites: nextFavorites,
            });
            if (authUser) {
              await removeSupabaseRecipe(id);
            }
            setScreen("recipes");
          },
        },
      ]
    );
  }
  // ----------------------------------------------------------
  // КОНЕЦ ЧАСТИ 5
  // ==========================================================

  // ==========================================================
  // ЧАСТЬ 6 ИЗ 8
  // ЭКРАНЫ СОЗДАНИЯ И РЕДАКТИРОВАНИЯ
  // ==========================================================
  // ----------------------------------------------------------
  // ОБЩИЕ СТИЛИ ЭЛЕМЕНТОВ ФОРМЫ
  // ----------------------------------------------------------
  const editorStyles = {
    page: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    content: {
      padding: 18,
      paddingBottom: 42,
      gap: 14,
    },
    heading: {
      color: COLORS.text,
      fontSize: 25,
      fontWeight: "800",
      marginBottom: 4,
    },
    label: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 6,
    },
    input: {
      backgroundColor: COLORS.card,
      color: COLORS.text,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 15,
    },
    field: {
      gap: 5,
      marginBottom: 4,
    },
    button: {
      backgroundColor: COLORS.green,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: 15,
    },
    secondaryButton: {
      backgroundColor: COLORS.lightGreen,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: {
      color: COLORS.green,
      fontWeight: "700",
      fontSize: 14,
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: 15,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    smallButton: {
      backgroundColor: COLORS.lightGreen,
      borderRadius: 9,
      paddingVertical: 9,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    smallButtonText: {
      color: COLORS.green,
      fontWeight: "700",
      fontSize: 12,
    },
  };
  // ----------------------------------------------------------
  // ПОЛЕ ФОРМЫ
  // ----------------------------------------------------------
  function renderEditorField(label, value, onChangeText, options = {}) {
    return (
      <View style={editorStyles.field} key={label}>
        <Text style={editorStyles.label}>{label}</Text>
        <TextInput
          value={String(value ?? "")}
          onChangeText={onChangeText}
          placeholder={options.placeholder || ""}
          placeholderTextColor={COLORS.muted}
          keyboardType={
            options.numeric ? "decimal-pad" : "default"
          }
          multiline={Boolean(options.multiline)}
          style={[
            editorStyles.input,
            options.multiline
              ? {
                  minHeight: 90,
                  textAlignVertical: "top",
                }
              : null,
          ]}
          autoCapitalize={options.autoCapitalize || "sentences"}
        />
      </View>
    );
  }
  // ----------------------------------------------------------
  // КНОПКА РЕДАКТОРА
  // ----------------------------------------------------------
  function renderEditorButton(
    title,
    onPress,
    secondary = false
  ) {
    return (
      <Pressable
        key={title}
        onPress={onPress}
        style={
          secondary
            ? editorStyles.secondaryButton
            : editorStyles.button
        }
      >
        <Text
          style={
            secondary
              ? editorStyles.secondaryText
              : editorStyles.buttonText
          }
        >
          {title}
        </Text>
      </Pressable>
    );
  }
  // ----------------------------------------------------------
  // РЕДАКТОР ПРОДУКТА
  // ----------------------------------------------------------
  function renderAuthorProductScreen() {
    const isEditing = Boolean(editingProductId);
    return (
      <SafeAreaView style={editorStyles.page}>
        <ScrollView
          contentContainerStyle={editorStyles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={goProducts}>
            <Text style={{ color: COLORS.green, fontWeight: "700" }}>
              ← Назад к продуктам
            </Text>
          </Pressable>
          <Text style={editorStyles.heading}>
            {isEditing ? "Редактировать продукт" : "Новый продукт"}
          </Text>
          <Text style={{ color: COLORS.muted, lineHeight: 21 }}>
            Все значения КБЖУ указываются на 100 г продукта.
          </Text>
          {renderEditorField(
            "Название продукта",
            productForm.name,
            (value) =>
              setProductForm((current) => ({
                ...current,
                name: value,
              })),
            { placeholder: "Например, куриная грудка" }
          )}
          {renderEditorField(
            "Категория",
            productForm.category,
            (value) =>
              setProductForm((current) => ({
                ...current,
                category: value,
              })),
            { placeholder: "Мясо, молочные продукты, овощи..." }
          )}
          <View style={editorStyles.card}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: COLORS.text,
              }}
            >
              Пищевая ценность на 100 г
            </Text>
            {renderEditorField(
              "Калории, ккал",
              productForm.kcal,
              (value) =>
                setProductForm((current) => ({
                  ...current,
                  kcal: value,
                })),
              { numeric: true, placeholder: "0" }
            )}
            {renderEditorField(
              "Белки, г",
              productForm.protein,
              (value) =>
                setProductForm((current) => ({
                  ...current,
                  protein: value,
                })),
              { numeric: true, placeholder: "0" }
            )}
            {renderEditorField(
              "Жиры, г",
              productForm.fat,
              (value) =>
                setProductForm((current) => ({
                  ...current,
                  fat: value,
                })),
              { numeric: true, placeholder: "0" }
            )}
            {renderEditorField(
              "Углеводы, г",
              productForm.carbs,
              (value) =>
                setProductForm((current) => ({
                  ...current,
                  carbs: value,
                })),
              { numeric: true, placeholder: "0" }
            )}
            {renderEditorField(
              "Клетчатка, г",
              productForm.fiber,
              (value) =>
                setProductForm((current) => ({
                  ...current,
                  fiber: value,
                })),
              { numeric: true, placeholder: "0" }
            )}
          </View>
          {renderEditorField(
            "Ссылка на изображение (необязательно)",
            productForm.image,
            (value) =>
              setProductForm((current) => ({
                ...current,
                image: value,
              })),
            {
              placeholder: "https://...",
              autoCapitalize: "none",
            }
          )}
          {renderEditorButton(
            isEditing ? "Сохранить изменения" : "Добавить продукт",
            saveProduct
          )}
          {renderEditorButton(
            "Отмена",
            () => {
              resetProductForm();
              setScreen(isEditing ? "product" : "products");
            },
            true
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // РЕДАКТОР РЕЦЕПТА
  // ----------------------------------------------------------
  function renderAuthorRecipeScreen() {
    const isEditing = Boolean(editingRecipeId);
    const currentIngredients = Array.isArray(recipeForm.ingredients)
      ? recipeForm.ingredients
      : [];
    const currentSteps = Array.isArray(recipeForm.steps)
      ? recipeForm.steps
      : [];
    return (
      <SafeAreaView style={editorStyles.page}>
        <ScrollView
          contentContainerStyle={editorStyles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => setScreen("recipes")}>
            <Text style={{ color: COLORS.green, fontWeight: "700" }}>
              ← Назад к рецептам
            </Text>
          </Pressable>
          <Text style={editorStyles.heading}>
            {isEditing ? "Редактировать рецепт" : "Новый рецепт"}
          </Text>
          {renderEditorField(
            "Название",
            recipeForm.title,
            (value) => updateRecipeField("title", value),
            { placeholder: "Название блюда" }
          )}
          {renderEditorField(
            "Категория",
            recipeForm.category,
            (value) => updateRecipeField("category", value),
            {
              placeholder:
                "Завтраки, основные блюда, десерты, выпечка...",
            }
          )}
          {renderEditorField(
            "Описание",
            recipeForm.description,
            (value) => updateRecipeField("description", value),
            {
              placeholder: "Расскажи о блюде",
              multiline: true,
            }
          )}
          {renderEditorField(
            "Ссылка на изображение",
            recipeForm.image,
            (value) => updateRecipeField("image", value),
            {
              placeholder: "https://...",
              autoCapitalize: "none",
            }
          )}
          <View style={editorStyles.card}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              Ингредиенты
            </Text>
            <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
              Введи название продукта из каталога и его количество
              в граммах. КБЖУ будет рассчитываться по данным
              продукта на 100 г.
            </Text>
            {currentIngredients.map((ingredient, index) => {
              const searchName = String(
                ingredient.product || ""
              ).trim().toLowerCase();
              const suggestions = searchName.length >= 2
                ? products
                    .filter((product) =>
                      product.name
                        .toLowerCase()
                        .includes(searchName)
                    )
                    .slice(0, 5)
                : [];
              return (
                <View
                  key={`ingredient-${index}`}
                  style={{
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: COLORS.border,
                    paddingTop: index === 0 ? 0 : 12,
                    gap: 8,
                  }}
                >
                  <Text style={editorStyles.label}>
                    Ингредиент {index + 1}
                  </Text>
                  <TextInput
                    value={String(ingredient.product || "")}
                    onChangeText={(value) =>
                      updateRecipeIngredient(
                        index,
                        "product",
                        value
                      )
                    }
                    placeholder="Название продукта"
                    placeholderTextColor={COLORS.muted}
                    style={editorStyles.input}
                  />
                  {suggestions.length > 0 && (
                    <View style={{ gap: 5 }}>
                      {suggestions.map((product) => (
                        <Pressable
                          key={String(product.id)}
                          onPress={() =>
                            updateRecipeIngredient(
                              index,
                              "productId",
                              String(product.id)
                            )
                          }
                          style={{
                            backgroundColor: COLORS.lightGreen,
                            padding: 9,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ color: COLORS.green }}>
                            {product.name} · {product.kcal} ккал/100 г
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <TextInput
                    value={String(ingredient.grams ?? "")}
                    onChangeText={(value) =>
                      updateRecipeIngredient(
                        index,
                        "grams",
                        value
                      )
                    }
                    placeholder="Количество в граммах"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="decimal-pad"
                    style={editorStyles.input}
                  />
                  <Pressable
                    onPress={() => removeRecipeIngredient(index)}
                    style={{
                      alignSelf: "flex-start",
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: COLORS.red, fontWeight: "700" }}>
                      Удалить ингредиент
                    </Text>
                  </Pressable>
                </View>
              );
            })}
            {renderEditorButton(
              "+ Добавить ингредиент",
              addRecipeIngredient,
              true
            )}
          </View>
          <View style={editorStyles.card}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              Приготовление
            </Text>
            {currentSteps.map((step, index) => (
              <View key={`step-${index}`} style={{ gap: 6 }}>
                <Text style={editorStyles.label}>
                  Шаг {index + 1}
                </Text>
                <TextInput
                  value={String(step || "")}
                  onChangeText={(value) =>
                    updateRecipeStep(index, value)
                  }
                  placeholder="Опиши действие"
                  placeholderTextColor={COLORS.muted}
                  multiline
                  style={[
                    editorStyles.input,
                    {
                      minHeight: 75,
                      textAlignVertical: "top",
                    },
                  ]}
                />
                <Pressable
                  onPress={() => removeRecipeStep(index)}
                  style={{
                    alignSelf: "flex-start",
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: COLORS.red, fontWeight: "700" }}>
                    Удалить шаг
                  </Text>
                </Pressable>
              </View>
            ))}
            {renderEditorButton(
              "+ Добавить шаг",
              addRecipeStep,
              true
            )}
          </View>
          <View style={editorStyles.card}>
            {renderEditorField(
              "Количество порций",
              recipeForm.servings,
              (value) => updateRecipeField("servings", value),
              { numeric: true }
            )}
            {renderEditorField(
              "Подготовка, минут",
              recipeForm.prepTime,
              (value) => updateRecipeField("prepTime", value),
              { numeric: true }
            )}
            {renderEditorField(
              "Приготовление, минут",
              recipeForm.cookTime,
              (value) => updateRecipeField("cookTime", value),
              { numeric: true }
            )}
            <Pressable
              onPress={() =>
                updateRecipeField("pro", !recipeForm.pro)
              }
              style={[
                editorStyles.row,
                { paddingVertical: 8 },
              ]}
            >
              <Switch
                value={Boolean(recipeForm.pro)}
                onValueChange={(value) =>
                  updateRecipeField("pro", value)
                }
                trackColor={{
                  false: COLORS.border,
                  true: COLORS.green2,
                }}
              />
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>
                Рецепт PaCook Pro
              </Text>
            </Pressable>
          </View>
          {renderEditorButton(
            isEditing ? "Сохранить изменения" : "Опубликовать рецепт",
            saveRecipe
          )}
          {renderEditorButton(
            "Отмена",
            () => {
              setEditingRecipeId(null);
              setScreen("recipes");
            },
            true
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // КОНЕЦ ЧАСТИ 6
  // Часть 7 — профиль, избранное и дневник.
  // ==========================================================

  // ==========================================================
  // ЧАСТЬ 7 ИЗ 8
  // ПРОФИЛЬ, ИЗБРАННОЕ, НАСТРОЙКИ И ДНЕВНИК
  // ==========================================================
  // ----------------------------------------------------------
  // СОХРАНЕНИЕ ПРОФИЛЯ
  // ----------------------------------------------------------
  async function saveProfile() {
    const nextProfile = {
      ...profile,
      name: cleanString(profileForm.name) || "PaCook User",
      avatarUrl: cleanString(profileForm.avatarUrl),
      bio: cleanString(profileForm.bio),
    };
    setProfile(nextProfile);
    setProfileForm(nextProfile);
    setProfileSaving(true);
    try {
      await writeLocalProfile(nextProfile);
      if (authUser?.id) {
        await saveSupabaseProfile(
          authUser.id,
          nextProfile
        );
      }
      Alert.alert("Готово", "Профиль сохранён.");
    } catch (error) {
      Alert.alert(
        "Не удалось сохранить",
        error?.message || "Проверь подключение и попробуй ещё раз."
      );
    } finally {
      setProfileSaving(false);
    }
  }
  function openProfileEditor() {
    setProfileForm({
      ...profile,
      name:
        profile?.name ||
        authUser?.user_metadata?.name ||
        "",
      avatarUrl:
        profile?.avatarUrl ||
        profile?.avatar_url ||
        "",
      bio: profile?.bio || "",
    });
    setScreen("editProfile");
  }
  // ----------------------------------------------------------
  // СОХРАНЕНИЕ НАСТРОЕК
  // ----------------------------------------------------------
  async function saveSettings(nextSettings) {
    setSettings(nextSettings);
    try {
      await AsyncStorage.setItem(
        "PACOOK_SETTINGS",
        JSON.stringify(nextSettings)
      );
    } catch (error) {
      console.warn("Не удалось сохранить настройки:", error);
    }
  }
  // ----------------------------------------------------------
  // ДНЕВНИК: ПОЛУЧЕНИЕ ЗАПИСЕЙ ЗА ДЕНЬ
  // ----------------------------------------------------------
  function getDiaryEntries(date = diaryDate) {
    const entries = diary && typeof diary === "object"
      ? diary[date]
      : [];
    return Array.isArray(entries) ? entries : [];
  }
  const currentDiaryEntries = getDiaryEntries();
  const diaryTotals = useMemo(() => {
    return currentDiaryEntries.reduce(
      (total, entry) => {
        const amount = num(entry.grams ?? entry.amount);
        const product = products.find(
          (item) =>
            String(item.id) === String(entry.productId) ||
            (
              entry.productName &&
              item.name.toLowerCase() ===
                String(entry.productName).toLowerCase()
            )
        );
        const nutrition = product
          ? calculateProductNutrition(product, amount)
          : {
              kcal: num(entry.kcal),
              protein: num(entry.protein),
              fat: num(entry.fat),
              carbs: num(entry.carbs),
            };
        total.kcal += nutrition.kcal;
        total.protein += nutrition.protein;
        total.fat += nutrition.fat;
        total.carbs += nutrition.carbs;
        return total;
      },
      {
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      }
    );
  }, [currentDiaryEntries, products]);
  // ----------------------------------------------------------
  // ДНЕВНИК: СОХРАНЕНИЕ ЗАПИСИ
  // ----------------------------------------------------------
  async function saveDiaryEntry() {
    const name = cleanString(diaryForm.productName);
    if (!name) {
      Alert.alert("Добавь продукт", "Введи название еды.");
      return;
    }
    const grams = num(diaryForm.grams);
    if (grams <= 0) {
      Alert.alert(
        "Проверь количество",
        "Количество должно быть больше нуля."
      );
      return;
    }
    const matchedProduct = products.find(
      (item) =>
        item.name.toLowerCase() === name.toLowerCase()
    );
    const entry = {
      id: editingDiaryId || makeId("diary"),
      productId: matchedProduct?.id
        ? String(matchedProduct.id)
        : "",
      productName: matchedProduct?.name || name,
      grams,
      meal: diaryForm.meal || "Завтрак",
      createdAt: new Date().toISOString(),
    };
    const dayEntries = getDiaryEntries().filter(
      (item) => String(item.id) !== String(editingDiaryId)
    );
    const nextDiary = {
      ...(diary || {}),
      [diaryDate]: [...dayEntries, entry],
    };
    setDiary(nextDiary);
    await persistData({
      diary: nextDiary,
    });
    setEditingDiaryId(null);
    setDiaryForm({
      productName: "",
      grams: "100",
      meal: "Завтрак",
    });
  }
  function startEditDiaryEntry(entry) {
    setEditingDiaryId(String(entry.id));
    setDiaryForm({
      productName: entry.productName || "",
      grams: String(entry.grams ?? entry.amount ?? 100),
      meal: entry.meal || "Завтрак",
    });
    setScreen("diary");
  }
  async function deleteDiaryEntry(entry) {
    const nextDiary = {
      ...(diary || {}),
      [diaryDate]: getDiaryEntries().filter(
        (item) => String(item.id) !== String(entry.id)
      ),
    };
    setDiary(nextDiary);
    await persistData({
      diary: nextDiary,
    });
  }
  function changeDiaryDate(offset) {
    const date = new Date(`${diaryDate}T12:00:00`);
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    setDiaryDate(`${year}-${month}-${day}`);
  }
  // ----------------------------------------------------------
  // ОБЩАЯ КАРТОЧКА КБЖУ
  // ----------------------------------------------------------
  function renderNutritionSummary(nutrition, subtitle = "") {
    const values = [
      {
        label: "Ккал",
        value: formatNumber(nutrition?.kcal || 0),
      },
      {
        label: "Белки",
        value: `${formatNumber(nutrition?.protein || 0)} г`,
      },
      {
        label: "Жиры",
        value: `${formatNumber(nutrition?.fat || 0)} г`,
      },
      {
        label: "Углеводы",
        value: `${formatNumber(nutrition?.carbs || 0)} г`,
      },
    ];
    return (
      <View
        style={{
          backgroundColor: COLORS.lightGreen,
          borderRadius: 15,
          padding: 14,
          gap: 12,
        }}
      >
        {subtitle ? (
          <Text style={{ color: COLORS.green, fontWeight: "700" }}>
            {subtitle}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {values.map((item) => (
            <View
              key={item.label}
              style={{
                width: "47%",
                flexGrow: 1,
                backgroundColor: COLORS.card,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                {item.label}
              </Text>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 17,
                  fontWeight: "800",
                  marginTop: 3,
                }}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  // ----------------------------------------------------------
  // ЭКРАН ПРОФИЛЯ
  // ----------------------------------------------------------
  function renderProfileScreen() {
    const name =
      profile?.name ||
      authUser?.user_metadata?.name ||
      "PaCook User";
    const avatarUrl =
      profile?.avatarUrl ||
      profile?.avatar_url ||
      "";
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 27,
              fontWeight: "800",
            }}
          >
            Профиль
          </Text>
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 18,
              padding: 20,
              alignItems: "center",
              gap: 10,
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: 94,
                  height: 94,
                  borderRadius: 47,
                  backgroundColor: COLORS.lightGreen,
                }}
              />
            ) : (
              <View
                style={{
                  width: 94,
                  height: 94,
                  borderRadius: 47,
                  backgroundColor: COLORS.lightGreen,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 42 }}>👨‍🍳</Text>
              </View>
            )}
            <Text
              style={{
                color: COLORS.text,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              {name}
            </Text>
            <Text style={{ color: COLORS.muted, textAlign: "center" }}>
              {authUser?.email || "Личный профиль PaCook"}
            </Text>
            {profile?.bio ? (
              <Text style={{ color: COLORS.text, textAlign: "center" }}>
                {profile.bio}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={openProfileEditor}
            style={editorStyles.button}
          >
            <Text style={editorStyles.buttonText}>
              Изменить профиль
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setScreen("favorites")}
            style={editorStyles.secondaryButton}
          >
            <Text style={editorStyles.secondaryText}>
              Избранные рецепты · {favoriteRecipes.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setScreen("diary")}
            style={editorStyles.secondaryButton}
          >
            <Text style={editorStyles.secondaryText}>
              Дневник питания
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setScreen("settings")}
            style={editorStyles.secondaryButton}
          >
            <Text style={editorStyles.secondaryText}>
              Цели КБЖУ и настройки
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setScreen("author")}
            style={editorStyles.secondaryButton}
          >
            <Text style={editorStyles.secondaryText}>
              Авторская панель
            </Text>
          </Pressable>
          {authUser ? (
            <Pressable
              onPress={logoutUser}
              style={{
                ...editorStyles.secondaryButton,
                backgroundColor: "#F8E7E5",
              }}
            >
              <Text style={{ color: COLORS.red, fontWeight: "700" }}>
                Выйти из аккаунта
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setScreen("auth")}
              style={editorStyles.button}
            >
              <Text style={editorStyles.buttonText}>
                Войти или зарегистрироваться
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // РЕДАКТИРОВАНИЕ ПРОФИЛЯ
  // ----------------------------------------------------------
  function renderEditProfileScreen() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          contentContainerStyle={editorStyles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={goProfile}>
            <Text style={{ color: COLORS.green, fontWeight: "700" }}>
              ← Назад в профиль
            </Text>
          </Pressable>
          <Text style={editorStyles.heading}>
            Редактировать профиль
          </Text>
          {renderEditorField(
            "Имя",
            profileForm.name,
            (value) =>
              setProfileForm((current) => ({
                ...current,
                name: value,
              }))
          )}
          {renderEditorField(
            "Ссылка на фото профиля",
            profileForm.avatarUrl || profileForm.avatar_url || "",
            (value) =>
              setProfileForm((current) => ({
                ...current,
                avatarUrl: value,
              })),
            {
              placeholder: "https://...",
              autoCapitalize: "none",
            }
          )}
          <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
            Вставь прямую ссылку на изображение. Загрузка фото из
            галереи потребует отдельного подключения выбора файлов
            и хранилища изображений.
          </Text>
          {renderEditorField(
            "О себе",
            profileForm.bio,
            (value) =>
              setProfileForm((current) => ({
                ...current,
                bio: value,
              })),
            { multiline: true }
          )}
          {renderEditorButton(
            profileSaving ? "Сохранение..." : "Сохранить профиль",
            saveProfile
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // ИЗБРАННОЕ
  // ----------------------------------------------------------
  function renderFavoritesScreen() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
          <Text style={editorStyles.heading}>Избранное</Text>
          {favoriteRecipes.length === 0 ? (
            <View style={editorStyles.card}>
              <Text style={{ color: COLORS.muted, lineHeight: 21 }}>
                Здесь пока пусто. Открой рецепт и нажми кнопку
                добавления в избранное.
              </Text>
            </View>
          ) : (
            favoriteRecipes.map((recipe) => (
              <Pressable
                key={String(recipe.id)}
                onPress={() => openRecipe(recipe)}
                style={editorStyles.card}
              >
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 17,
                    fontWeight: "800",
                  }}
                >
                  {recipe.title || recipe.name}
                </Text>
                <Text style={{ color: COLORS.muted }}>
                  {recipe.category || "Рецепт"}
                </Text>
                <Text style={{ color: COLORS.green, fontWeight: "700" }}>
                  Открыть рецепт →
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // ДНЕВНИК ПИТАНИЯ
  // ----------------------------------------------------------
  function renderDiaryScreen() {
    const goal = num(settings.calorieGoal) || 2000;
    const progress = Math.min(
      100,
      Math.round((diaryTotals.kcal / goal) * 100)
    );
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          contentContainerStyle={{ padding: 18, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={editorStyles.heading}>Дневник питания</Text>
          <View
            style={[
              editorStyles.row,
              { justifyContent: "space-between" },
            ]}
          >
            <Pressable
              onPress={() => changeDiaryDate(-1)}
              style={editorStyles.secondaryButton}
            >
              <Text style={editorStyles.secondaryText}>← День</Text>
            </Pressable>
            <Text style={{ color: COLORS.text, fontWeight: "800" }}>
              {diaryDate}
            </Text>
            <Pressable
              onPress={() => changeDiaryDate(1)}
              style={editorStyles.secondaryButton}
            >
              <Text style={editorStyles.secondaryText}>День →</Text>
            </Pressable>
          </View>
          {renderNutritionSummary(
            diaryTotals,
            `За день · цель ${goal} ккал`
          )}
          <View
            style={{
              height: 9,
              borderRadius: 9,
              backgroundColor: COLORS.border,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 9,
                width: `${progress}%`,
                backgroundColor: COLORS.green,
                borderRadius: 9,
              }}
            />
          </View>
          <Text style={{ color: COLORS.muted }}>
            Осталось: {formatNumber(Math.max(0, goal - diaryTotals.kcal))} ккал
          </Text>
          <View style={editorStyles.card}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "800" }}>
              {editingDiaryId ? "Изменить запись" : "Добавить еду"}
            </Text>
            {renderEditorField(
              "Продукт",
              diaryForm.productName,
              (value) =>
                setDiaryForm((current) => ({
                  ...current,
                  productName: value,
                })),
              { placeholder: "Название продукта" }
            )}
            {renderEditorField(
              "Количество, г",
              diaryForm.grams,
              (value) =>
                setDiaryForm((current) => ({
                  ...current,
                  grams: value,
                })),
              { numeric: true }
            )}
            <Text style={editorStyles.label}>Приём пищи</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {["Завтрак", "Обед", "Ужин", "Перекус"].map((meal) => (
                <Pressable
                  key={meal}
                  onPress={() =>
                    setDiaryForm((current) => ({
                      ...current,
                      meal,
                    }))
                  }
                  style={{
                    backgroundColor:
                      diaryForm.meal === meal
                        ? COLORS.green
                        : COLORS.lightGreen,
                    borderRadius: 10,
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      color:
                        diaryForm.meal === meal
                          ? COLORS.white
                          : COLORS.green,
                      fontWeight: "700",
                    }}
                  >
                    {meal}
                  </Text>
                </Pressable>
              ))}
            </View>
            {renderEditorButton(
              editingDiaryId ? "Сохранить запись" : "Добавить в дневник",
              saveDiaryEntry
            )}
            {editingDiaryId
              ? renderEditorButton(
                  "Отменить редактирование",
                  () => {
                    setEditingDiaryId(null);
                    setDiaryForm({
                      productName: "",
                      grams: "100",
                      meal: "Завтрак",
                    });
                  },
                  true
                )
              : null}
          </View>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 19,
              fontWeight: "800",
            }}
          >
            Записи за день
          </Text>
          {currentDiaryEntries.length === 0 ? (
            <Text style={{ color: COLORS.muted }}>
              За этот день записей пока нет.
            </Text>
          ) : (
            currentDiaryEntries.map((entry) => (
              <View
                key={String(entry.id)}
                style={[
                  editorStyles.card,
                  editorStyles.row,
                  { justifyContent: "space-between" },
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: COLORS.text, fontWeight: "800" }}>
                    {entry.productName}
                  </Text>
                  <Text style={{ color: COLORS.muted }}>
                    {entry.meal} · {entry.grams} г
                  </Text>
                  <Text style={{ color: COLORS.green, fontWeight: "700" }}>
                    {formatNumber(
                      calculateProductNutrition(
                        products.find(
                          (item) =>
                            String(item.id) === String(entry.productId)
                        ) || {},
                        num(entry.grams)
                      ).kcal
                    )} ккал
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  <Pressable onPress={() => startEditDiaryEntry(entry)}>
                    <Text style={{ color: COLORS.green, fontWeight: "700" }}>
                      Изменить
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => deleteDiaryEntry(entry)}>
                    <Text style={{ color: COLORS.red, fontWeight: "700" }}>
                      Удалить
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // НАСТРОЙКИ ЦЕЛЕЙ КБЖУ
  // ----------------------------------------------------------
  function renderSettingsScreen() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView contentContainerStyle={editorStyles.content}>
          <Pressable onPress={goProfile}>
            <Text style={{ color: COLORS.green, fontWeight: "700" }}>
              ← Назад в профиль
            </Text>
          </Pressable>
          <Text style={editorStyles.heading}>Цели питания</Text>
          {renderEditorField(
            "Калории в день",
            settings.calorieGoal,
            (value) =>
              setSettings((current) => ({
                ...current,
                calorieGoal: value,
              })),
            { numeric: true }
          )}
          {renderEditorField(
            "Белки, г",
            settings.proteinGoal,
            (value) =>
              setSettings((current) => ({
                ...current,
                proteinGoal: value,
              })),
            { numeric: true }
          )}
          {renderEditorField(
            "Жиры, г",
            settings.fatGoal,
            (value) =>
              setSettings((current) => ({
                ...current,
                fatGoal: value,
              })),
            { numeric: true }
          )}
          {renderEditorField(
            "Углеводы, г",
            settings.carbsGoal,
            (value) =>
              setSettings((current) => ({
                ...current,
                carbsGoal: value,
              })),
            { numeric: true }
          )}
          {renderEditorButton(
            "Сохранить цели",
            async () => {
              const normalized = {
                ...settings,
                calorieGoal: num(settings.calorieGoal) || 2000,
                proteinGoal: num(settings.proteinGoal),
                fatGoal: num(settings.fatGoal),
                carbsGoal: num(settings.carbsGoal),
              };
              await saveSettings(normalized);
              Alert.alert("Готово", "Цели питания сохранены.");
              setScreen("profile");
            }
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // КОНЕЦ ЧАСТИ 7
  // ==========================================================

  // ==========================================================
  // ЧАСТЬ 8 ИЗ 8
  // ОСНОВНЫЕ ЭКРАНЫ, НАВИГАЦИЯ И ЗАВЕРШЕНИЕ APP
  // ==========================================================
  // ----------------------------------------------------------
  // КАРТОЧКА ПРОДУКТА
  // ----------------------------------------------------------
  function renderProductCard(product) {
    return (
      <View
        key={String(product.id)}
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 13,
          gap: 9,
        }}
      >
        <Pressable onPress={() => openProduct(product)}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.text }}>
            {getProductEmoji(product)} {product.name}
          </Text>
          <Text style={{ color: COLORS.muted, marginTop: 4 }}>
            {product.category || "Другое"}
          </Text>
        </Pressable>
        {renderNutritionSummary(
          {
            kcal: product.kcal,
            protein: product.protein,
            fat: product.fat,
            carbs: product.carbs,
          },
          "На 100 г"
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pressable
            onPress={() => addProductToCalculator(product)}
            style={{
              backgroundColor: COLORS.green,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: COLORS.white, fontWeight: "700" }}>
              + В калькулятор
            </Text>
          </Pressable>
          <Pressable
            onPress={() => startEditProduct(product)}
            style={editorStyles.smallButton}
          >
            <Text style={editorStyles.smallButtonText}>Изменить</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  // ----------------------------------------------------------
  // КАЛЬКУЛЯТОР КБЖУ ПРОДУКТОВ
  // ----------------------------------------------------------
  function renderProductCalculator() {
    const totals = calcItems.reduce(
      (result, item) => {
        const product = products.find(
          (entry) => String(entry.id) === String(item.productId)
        );
        if (!product) {
          return result;
        }
        const nutrition = calculateProductNutrition(
          product,
          num(item.grams)
        );
        result.kcal += nutrition.kcal;
        result.protein += nutrition.protein;
        result.fat += nutrition.fat;
        result.carbs += nutrition.carbs;
        return result;
      },
      { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    );
    const matchingProducts = calcProductSearch.trim()
      ? products
          .filter((product) =>
            product.name
              .toLowerCase()
              .includes(calcProductSearch.trim().toLowerCase())
          )
          .slice(0, 8)
      : [];
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: COLORS.text, fontSize: 21, fontWeight: "800" }}>
          Калькулятор КБЖУ
        </Text>
        <Text style={{ color: COLORS.muted, lineHeight: 21 }}>
          Добавляй продукты и указывай их вес. Значения суммируются
          автоматически.
        </Text>
        <TextInput
          value={calcProductSearch}
          onChangeText={setCalcProductSearch}
          placeholder="Найти продукт для расчёта..."
          placeholderTextColor={COLORS.muted}
          style={editorStyles.input}
        />
        {matchingProducts.map((product) => (
          <Pressable
            key={String(product.id)}
            onPress={() => addProductToCalculator(product)}
            style={{
              backgroundColor: COLORS.lightGreen,
              padding: 11,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: COLORS.green, fontWeight: "700" }}>
              + {product.name} · {product.kcal} ккал/100 г
            </Text>
          </Pressable>
        ))}
        {calcItems.map((item) => {
          const product = products.find(
            (entry) => String(entry.id) === String(item.productId)
          );
          if (!product) {
            return null;
          }
          const nutrition = calculateProductNutrition(
            product,
            num(item.grams)
          );
          return (
            <View
              key={String(item.id)}
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 12,
                padding: 12,
                gap: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ color: COLORS.text, fontWeight: "800" }}>
                {product.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TextInput
                  value={String(item.grams ?? "")}
                  onChangeText={(value) =>
                    updateCalculatorGrams(item.id, value)
                  }
                  keyboardType="decimal-pad"
                  placeholder="Граммы"
                  style={[editorStyles.input, { flex: 1 }]}
                />
                <Pressable onPress={() => removeCalculatorItem(item.id)}>
                  <Text style={{ color: COLORS.red, fontWeight: "700" }}>
                    Удалить
                  </Text>
                </Pressable>
              </View>
              <Text style={{ color: COLORS.muted }}>
                {formatNumber(nutrition.kcal)} ккал · Б {formatNumber(nutrition.protein)} г
                {" · "}Ж {formatNumber(nutrition.fat)} г
                {" · "}У {formatNumber(nutrition.carbs)} г
              </Text>
            </View>
          );
        })}
        {renderNutritionSummary(totals, "Итого по выбранным продуктам")}
        <Pressable
          onPress={clearCalculator}
          style={editorStyles.secondaryButton}
        >
          <Text style={editorStyles.secondaryText}>Очистить калькулятор</Text>
        </Pressable>
      </View>
    );
  }
  // ----------------------------------------------------------
  // КАТАЛОГ ПРОДУКТОВ
  // ----------------------------------------------------------
  function renderProductsScreen() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 30, gap: 15 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={editorStyles.heading}>Продукты</Text>
          <Text style={{ color: COLORS.muted, lineHeight: 21 }}>
            Каталог продуктов и пищевая ценность на 100 г.
          </Text>
          {renderProductCalculator()}
          <View style={{ gap: 10 }}>
            <Text style={{ color: COLORS.text, fontSize: 21, fontWeight: "800" }}>
              Каталог
            </Text>
            <TextInput
              value={productsSearch}
              onChangeText={setProductsSearch}
              placeholder="Поиск продукта..."
              placeholderTextColor={COLORS.muted}
              style={editorStyles.input}
            />
            {renderEditorButton(
              "+ Добавить продукт",
              startCreateProduct
            )}
            <Text style={{ color: COLORS.muted }}>
              Найдено продуктов: {filteredProducts.length}
            </Text>
            {filteredProducts.length ? (
              filteredProducts.map(renderProductCard)
            ) : (
              <View style={editorStyles.card}>
                <Text style={{ color: COLORS.muted }}>
                  Продукты не найдены. Попробуй изменить поиск.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // КАРТОЧКА ПРОДУКТА
  // ----------------------------------------------------------
  function renderProductDetailScreen() {
    const product = selectedProduct;
    if (!product) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <View style={{ padding: 18, gap: 12 }}>
            <Text style={editorStyles.heading}>Продукт не выбран</Text>
            {renderEditorButton("К каталогу", goProducts)}
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView contentContainerStyle={editorStyles.content}>
          <Pressable onPress={closeProduct}>
            <Text style={{ color: COLORS.green, fontWeight: "700" }}>
              ← Назад к продуктам
            </Text>
          </Pressable>
          <Text style={editorStyles.heading}>
            {getProductEmoji(product)} {product.name}
          </Text>
          <Text style={{ color: COLORS.muted }}>
            Категория: {product.category || "Другое"}
          </Text>
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              style={{
                width: "100%",
                height: 210,
                borderRadius: 15,
                backgroundColor: COLORS.lightGreen,
              }}
              resizeMode="cover"
            />
          ) : null}
          {renderNutritionSummary(
            product,
            "Пищевая ценность на 100 г"
          )}
          {renderEditorButton(
            "Добавить в калькулятор КБЖУ",
            () => {
              addProductToCalculator(product);
              setScreen("products");
            }
          )}
          {renderEditorButton(
            "Редактировать продукт",
            () => startEditProduct(product),
            true
          )}
          {renderEditorButton(
            "Удалить продукт",
            () => deleteProduct(product),
            true
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // КАРТОЧКА РЕЦЕПТА В КАТАЛОГЕ
  // ----------------------------------------------------------
  function renderRecipeCard(recipe) {
    const nutrition = getRecipeNutrition(recipe);
    return (
      <Pressable
        key={String(recipe.id)}
        onPress={() => openRecipe(recipe)}
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 15,
          padding: 14,
          gap: 9,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {recipe.image ? (
          <Image
            source={{ uri: recipe.image }}
            style={{
              width: "100%",
              height: 170,
              borderRadius: 11,
              backgroundColor: COLORS.lightGreen,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              height: 100,
              backgroundColor: COLORS.lightGreen,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 37 }}>
              {getRecipeImage(recipe)}
            </Text>
          </View>
        )}
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "800" }}>
          {recipe.title || recipe.name}
        </Text>
        <Text style={{ color: COLORS.muted }}>
          {recipe.category || "Домашние блюда"}
          {recipe.pro ? " · PaCook Pro" : ""}
        </Text>
        <Text style={{ color: COLORS.green, fontWeight: "700" }}>
          {formatNumber(nutrition.kcal)} ккал на весь рецепт
        </Text>
        <Text style={{ color: COLORS.muted }}>
          Б {formatNumber(nutrition.protein)} г ·
          {" "}Ж {formatNumber(nutrition.fat)} г ·
          {" "}У {formatNumber(nutrition.carbs)} г
        </Text>
      </Pressable>
    );
  }
  // ----------------------------------------------------------
  // КАТАЛОГ РЕЦЕПТОВ
  // ----------------------------------------------------------
  function renderRecipesScreen() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 30, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={editorStyles.heading}>Рецепты</Text>
          <Text style={{ color: COLORS.muted, lineHeight: 21 }}>
            Домашние блюда, десерты, выпечка и рецепты с расчётом КБЖУ.
          </Text>
          <TextInput
            value={recipesSearch}
            onChangeText={setRecipesSearch}
            placeholder="Поиск рецепта..."
            placeholderTextColor={COLORS.muted}
            style={editorStyles.input}
          />
          {renderEditorButton(
            "+ Создать рецепт",
            startCreateRecipe
          )}
          <Text style={{ color: COLORS.muted }}>
            Рецептов: {filteredRecipes.length}
          </Text>
          {filteredRecipes.length ? (
            filteredRecipes.map(renderRecipeCard)
          ) : (
            <View style={editorStyles.card}>
              <Text style={{ color: COLORS.muted }}>
                Ничего не найдено. Попробуй изменить поисковый запрос.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // ПОДРОБНЫЙ ЭКРАН РЕЦЕПТА
  // ----------------------------------------------------------
  function renderRecipeDetailScreen() {
    const recipe = selectedRecipe;
    if (!recipe) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <View style={{ padding: 18, gap: 12 }}>
            <Text style={editorStyles.heading}>Рецепт не выбран</Text>
            {renderEditorButton("К рецептам", goRecipes)}
          </View>
        </SafeAreaView>
      );
    }
    const nutrition = getRecipeNutrition(recipe);
    const ingredients = getRecipeIngredientsWithProducts(recipe);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView contentContainerStyle={editorStyles.content}>
          <Pressable onPress={closeRecipe}>
            <Text style={{ color: COLORS.green, fontWeight: "700" }}>
              ← Назад к рецептам
            </Text>
          </Pressable>
          <Text style={editorStyles.heading}>
            {recipe.title || recipe.name}
          </Text>
          <Text style={{ color: COLORS.muted }}>
            {recipe.category || "Домашнее блюдо"}
            {recipe.pro ? " · PaCook Pro" : ""}
          </Text>
          {recipe.image ? (
            <Image
              source={{ uri: recipe.image }}
              style={{
                width: "100%",
                height: 220,
                borderRadius: 15,
                backgroundColor: COLORS.lightGreen,
              }}
              resizeMode="cover"
            />
          ) : null}
          {recipe.description ? (
            <Text style={{ color: COLORS.text, lineHeight: 22 }}>
              {recipe.description}
            </Text>
          ) : null}
          <View style={editorStyles.card}>
            <Text style={{ color: COLORS.text, fontWeight: "800" }}>
              ⏱ Подготовка: {num(recipe.prepTime ?? recipe.prep_time)} мин
            </Text>
            <Text style={{ color: COLORS.text, fontWeight: "800" }}>
              🍳 Приготовление: {num(recipe.cookTime ?? recipe.cook_time)} мин
            </Text>
            <Text style={{ color: COLORS.text, fontWeight: "800" }}>
              🍽 Порций: {num(recipe.servings) || 1}
            </Text>
          </View>
          {renderNutritionSummary(
            nutrition,
            "КБЖУ всего рецепта"
          )}
          {renderNutritionSummary(
            {
              kcal: nutrition.kcal / Math.max(1, num(recipe.servings) || 1),
              protein: nutrition.protein / Math.max(1, num(recipe.servings) || 1),
              fat: nutrition.fat / Math.max(1, num(recipe.servings) || 1),
              carbs: nutrition.carbs / Math.max(1, num(recipe.servings) || 1),
            },
            "На одну порцию"
          )}
          <View style={editorStyles.card}>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: "800" }}>
              Ингредиенты
            </Text>
            {ingredients.map((ingredient, index) => (
              <View
                key={`detail-ingredient-${index}`}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingVertical: 7,
                  borderBottomWidth: index === ingredients.length - 1 ? 0 : 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.text, flex: 1 }}>
                  {ingredient.productName}
                </Text>
                <Text style={{ color: COLORS.green, fontWeight: "700" }}>
                  {formatNumber(ingredient.grams)} г
                </Text>
              </View>
            ))}
          </View>
          <View style={editorStyles.card}>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: "800" }}>
              Приготовление
            </Text>
            {(Array.isArray(recipe.steps) ? recipe.steps : []).map(
              (step, index) => (
                <View
                  key={`detail-step-${index}`}
                  style={{ flexDirection: "row", gap: 10 }}
                >
                  <Text style={{ color: COLORS.green, fontWeight: "800" }}>
                    {index + 1}.
                  </Text>
                  <Text style={{ color: COLORS.text, flex: 1, lineHeight: 22 }}>
                    {typeof step === "string" ? step : step?.text || ""}
                  </Text>
                </View>
              )
            )}
          </View>
          {renderEditorButton(
            isFavorite(recipe)
              ? "♥ Убрать из избранного"
              : "♡ Добавить в избранное",
            () => toggleFavorite(recipe),
            true
          )}
          {renderEditorButton(
            "Редактировать рецепт",
            () => startEditRecipe(recipe)
          )}
          {renderEditorButton(
            "Удалить рецепт",
            () => deleteRecipe(recipe),
            true
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // ГЛАВНЫЙ ЭКРАН
  // ----------------------------------------------------------
  function renderHomeScreen() {
    const featuredRecipes = recipes.slice(0, 4);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 30, gap: 16 }}
        >
          <Text
            style={{
              color: COLORS.green,
              fontSize: 14,
              fontWeight: "800",
              letterSpacing: 1,
            }}
          >
            PACOOK
          </Text>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 30,
              fontWeight: "900",
              lineHeight: 36,
            }}
          >
            Готовь умнее.
            {"\n"}Ешь лучше.
          </Text>
          <Text style={{ color: COLORS.muted, lineHeight: 22 }}>
            Рецепты, продукты и расчёт калорий — в одном месте.
          </Text>
          <View style={editorStyles.card}>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: "800" }}>
              Что будем готовить?
            </Text>
            {renderEditorButton("Открыть рецепты", goRecipes)}
            {renderEditorButton("Каталог продуктов и КБЖУ", goProducts, true)}
            {renderEditorButton("Дневник питания", () => setScreen("diary"), true)}
          </View>
          <Text style={{ color: COLORS.text, fontSize: 21, fontWeight: "800" }}>
            Популярные рецепты
          </Text>
          {featuredRecipes.map(renderRecipeCard)}
          <Pressable onPress={goProfile} style={editorStyles.secondaryButton}>
            <Text style={editorStyles.secondaryText}>
              Перейти в профиль
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // ЭКРАН АВТОРИЗАЦИИ
  // ----------------------------------------------------------
  function renderAuthScreen() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 22,
              gap: 15,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              style={{
                color: COLORS.green,
                fontSize: 16,
                fontWeight: "900",
                letterSpacing: 2,
                textAlign: "center",
              }}
            >
              PACOOK
            </Text>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 29,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              {authMode === "signup" ? "Создать аккаунт" : "С возвращением"}
            </Text>
            <Text style={{ color: COLORS.muted, textAlign: "center", lineHeight: 22 }}>
              {authMode === "signup"
                ? "Зарегистрируйся, чтобы войти в PaCook."
                : "Войди в свой аккаунт PaCook."}
            </Text>
            {authMode === "signup"
              ? renderEditorField(
                  "Имя",
                  authName,
                  setAuthName,
                  { placeholder: "Как тебя зовут?" }
                )
              : null}
            {renderEditorField(
              "Электронная почта",
              authEmail,
              setAuthEmail,
              {
                placeholder: "name@example.com",
                autoCapitalize: "none",
              }
            )}
            <View style={editorStyles.field}>
              <Text style={editorStyles.label}>Пароль</Text>
              <TextInput
                value={authPassword}
                onChangeText={setAuthPassword}
                placeholder="Минимум 6 символов"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                autoCapitalize="none"
                style={editorStyles.input}
              />
            </View>
            {authError ? (
              <Text style={{ color: COLORS.red, lineHeight: 21 }}>
                {authError}
              </Text>
            ) : null}
            <Pressable
              onPress={
                authMode === "signup"
                  ? handleRegister
                  : handleLogin
              }
              disabled={authLoading}
              style={[
                editorStyles.button,
                authLoading ? { opacity: 0.65 } : null,
              ]}
            >
              <Text style={editorStyles.buttonText}>
                {authLoading
                  ? "Подожди..."
                  : authMode === "signup"
                    ? "Зарегистрироваться"
                    : "Войти"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAuthError("");
                setAuthMode(
                  authMode === "signup" ? "login" : "signup"
                );
              }}
              style={editorStyles.secondaryButton}
            >
              <Text style={editorStyles.secondaryText}>
                {authMode === "signup"
                  ? "Уже есть аккаунт? Войти"
                  : "Нет аккаунта? Зарегистрироваться"}
              </Text>
            </Pressable>
            <Pressable
              onPress={goHome}
              style={{ padding: 10, alignItems: "center" }}
            >
              <Text style={{ color: COLORS.muted }}>
                Продолжить без входа
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // АВТОРСКАЯ ПАНЕЛЬ
  // ----------------------------------------------------------
  function renderAuthorScreen() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView contentContainerStyle={editorStyles.content}>
          <Text style={editorStyles.heading}>Авторская панель</Text>
          <Text style={{ color: COLORS.muted, lineHeight: 22 }}>
            Управляй каталогом продуктов и рецептами.
          </Text>
          {renderEditorButton(
            "+ Добавить продукт",
            startCreateProduct
          )}
          {renderEditorButton(
            "+ Создать рецепт",
            startCreateRecipe
          )}
          {renderEditorButton(
            "Открыть каталог продуктов",
            goProducts,
            true
          )}
          {renderEditorButton(
            "Открыть каталог рецептов",
            goRecipes,
            true
          )}
          {renderEditorButton(
            "Вернуться в профиль",
            goProfile,
            true
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ----------------------------------------------------------
  // НИЖНЯЯ НАВИГАЦИЯ
  // ----------------------------------------------------------
  function renderBottomNavigation() {
    const tabs = [
      { id: "home", label: "Главная", emoji: "⌂" },
      { id: "products", label: "Продукты", emoji: "◉" },
      { id: "recipes", label: "Рецепты", emoji: "♨" },
      { id: "diary", label: "Дневник", emoji: "▤" },
      { id: "profile", label: "Профиль", emoji: "○" },
    ];
    const hiddenScreens = [
      "auth",
      "author",
      "authorProduct",
      "authorRecipe",
      "editProfile",
      "settings",
      "product",
      "recipeDetail",
    ];
    if (hiddenScreens.includes(screen)) {
      return null;
    }
    return (
      <View
        style={{
          flexDirection: "row",
          backgroundColor: COLORS.card,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 12 : 8,
        }}
      >
        {tabs.map((tab) => {
          const active = screen === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setScreen(tab.id)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 5,
                gap: 3,
              }}
            >
              <Text
                style={{
                  color: active ? COLORS.green : COLORS.muted,
                  fontSize: 19,
                  fontWeight: active ? "900" : "500",
                }}
              >
                {tab.emoji}
              </Text>
              <Text
                style={{
                  color: active ? COLORS.green : COLORS.muted,
                  fontSize: 10,
                  fontWeight: active ? "800" : "500",
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  // ----------------------------------------------------------
  // ГЛАВНЫЙ RETURN
  // ----------------------------------------------------------
  if (!dataLoaded || !authChecked) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={{ color: COLORS.green, fontWeight: "800" }}>
          PaCook загружается...
        </Text>
      </SafeAreaView>
    );
  }
  let activeScreen;
  switch (screen) {
    case "home":
      activeScreen = renderHomeScreen();
      break;
    case "products":
      activeScreen = renderProductsScreen();
      break;
    case "product":
      activeScreen = renderProductDetailScreen();
      break;
    case "recipes":
      activeScreen = renderRecipesScreen();
      break;
    case "recipeDetail":
      activeScreen = renderRecipeDetailScreen();
      break;
    case "author":
      activeScreen = renderAuthorScreen();
      break;
    case "authorProduct":
      activeScreen = renderAuthorProductScreen();
      break;
    case "authorRecipe":
      activeScreen = renderAuthorRecipeScreen();
      break;
    case "profile":
      activeScreen = renderProfileScreen();
      break;
    case "editProfile":
      activeScreen = renderEditProfileScreen();
      break;
    case "favorites":
      activeScreen = renderFavoritesScreen();
      break;
    case "diary":
      activeScreen = renderDiaryScreen();
      break;
    case "settings":
      activeScreen = renderSettingsScreen();
      break;
    case "auth":
      activeScreen = renderAuthScreen();
      break;
    default:
      activeScreen = renderHomeScreen();
      break;
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1 }}>
        {activeScreen}
      </View>
      {renderBottomNavigation()}
    </SafeAreaView>
  );
}