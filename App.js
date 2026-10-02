import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* =========================================================
   PACOOK
   Recipes + Products + Author Mode + Local Storage + Supabase
========================================================= */

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL = "https://fzjpsrcgmfihpnavnqdc.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_SfEpToq_GIgL37TYTNesIw_VAp6q5yt";

async function signUpSupabase(email, password) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/signup`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.msg ||
      data?.message ||
      data?.error_description ||
      "Ошибка регистрации"
    );
  }

  return data;
}

async function signInSupabase(email, password) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.msg ||
      data?.message ||
      data?.error_description ||
      "Ошибка входа"
    );
  }

  return data;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Введите email и пароль");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        mode === "login"
          ? await signInSupabase(
              email.trim(),
              password
            )
          : await signUpSupabase(
              email.trim(),
              password
            );

      if (data?.access_token && data?.user) {
        await AsyncStorage.setItem(
          "PACOOK_SESSION",
          JSON.stringify({
            access_token: data.access_token,
            user: data.user,
          })
        );

        onAuth(data.user);
        return;
      }

      if (mode === "register" && data?.user) {
        setMode("login");
        setError(
          "Аккаунт создан. Теперь войдите."
        );
        return;
      }

      setError("Не удалось выполнить операцию");
    } catch (e) {
      console.log("AUTH ERROR:", e);

      setError(
        e?.message ||
          "Ошибка. Проверьте email и пароль."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: COLORS.background,
      }}
    >
      <Text
        style={{
          fontSize: 38,
          fontWeight: "800",
          color: COLORS.green,
          textAlign: "center",
        }}
      >
        PaCook
      </Text>

      <Text
        style={{
          textAlign: "center",
          marginTop: 6,
          marginBottom: 32,
          color: "#888",
        }}
      >
        Cook smart. Eat better.
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!loading}
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: 16,
          marginBottom: 12,
          fontSize: 16,
        }}
      />

      <TextInput
        placeholder="Пароль"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: 16,
          marginBottom: 12,
          fontSize: 16,
        }}
      />

      {error ? (
        <Text
          style={{
            color: "#D9534F",
            marginBottom: 12,
            lineHeight: 20,
          }}
        >
          {error}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={handleAuth}
        disabled={loading}
        style={{
          backgroundColor: COLORS.green,
          padding: 16,
          borderRadius: 14,
          alignItems: "center",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          {loading
            ? "Загрузка..."
            : mode === "login"
            ? "Войти"
            : "Создать аккаунт"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={loading}
        onPress={() => {
          setMode(
            mode === "login"
              ? "register"
              : "login"
          );
          setError("");
        }}
      >
        <Text
          style={{
            textAlign: "center",
            marginTop: 20,
            color: COLORS.green,
            fontWeight: "600",
          }}
        >
          {mode === "login"
            ? "Нет аккаунта? Создать"
            : "Уже есть аккаунт? Войти"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
/*
  Загружаем продукты из Supabase REST API.
  Никаких дополнительных библиотек не требуется.
*/

async function getSupabaseProducts() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Ошибка Supabase: ${response.status}`
    );
  }

  return response.json();
}

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  bg: "#F7F4EC",
  card: "#FFFDF8",
  green: "#345C48",
  green2: "#527966",
  lightGreen: "#E5EEE7",
  text: "#1D2922",
  muted: "#7A817C",
  border: "#E6E1D6",
  white: "#FFFFFF",
  red: "#B94A48",
};

/* =========================================================
   INITIAL PRODUCTS
========================================================= */

const INITIAL_PRODUCTS = {
  "Творог 5%": {
    kcal: 121,
    protein: 17,
    fat: 5,
    carbs: 2,
  },

  "Творог 2%": {
    kcal: 103,
    protein: 18,
    fat: 2,
    carbs: 3,
  },

  "Греческий йогурт": {
    kcal: 73,
    protein: 10,
    fat: 2,
    carbs: 4,
  },

  "Молоко 2.5%": {
    kcal: 52,
    protein: 3,
    fat: 2.5,
    carbs: 4.7,
  },

  Яйцо: {
    kcal: 157,
    protein: 13,
    fat: 11,
    carbs: 1.1,
  },

  "Белок яйца": {
    kcal: 52,
    protein: 11,
    fat: 0.2,
    carbs: 0.7,
  },

  Овсянка: {
    kcal: 366,
    protein: 12,
    fat: 6,
    carbs: 60,
  },

  "Рисовая мука": {
    kcal: 366,
    protein: 6,
    fat: 1,
    carbs: 80,
  },

  "Пшеничная мука": {
    kcal: 334,
    protein: 10,
    fat: 1,
    carbs: 70,
  },

  "Цельнозерновая мука": {
    kcal: 340,
    protein: 13,
    fat: 2.5,
    carbs: 62,
  },

  Какао: {
    kcal: 228,
    protein: 20,
    fat: 14,
    carbs: 58,
  },

  Банан: {
    kcal: 89,
    protein: 1.1,
    fat: 0.3,
    carbs: 23,
  },

  Яблоко: {
    kcal: 52,
    protein: 0.3,
    fat: 0.2,
    carbs: 14,
  },

  Клубника: {
    kcal: 32,
    protein: 0.7,
    fat: 0.3,
    carbs: 7.7,
  },

  Малина: {
    kcal: 52,
    protein: 1.2,
    fat: 0.7,
    carbs: 12,
  },

  Черника: {
    kcal: 57,
    protein: 0.7,
    fat: 0.3,
    carbs: 14,
  },

  Авокадо: {
    kcal: 160,
    protein: 2,
    fat: 15,
    carbs: 9,
  },

  "Куриная грудка": {
    kcal: 110,
    protein: 23,
    fat: 1.9,
    carbs: 0,
  },

  Индейка: {
    kcal: 114,
    protein: 23,
    fat: 2,
    carbs: 0,
  },

  Лосось: {
    kcal: 208,
    protein: 20,
    fat: 13,
    carbs: 0,
  },

  Тунец: {
    kcal: 132,
    protein: 29,
    fat: 1,
    carbs: 0,
  },

  Рис: {
    kcal: 344,
    protein: 6.7,
    fat: 0.7,
    carbs: 78,
  },

  Гречка: {
    kcal: 343,
    protein: 13,
    fat: 3.4,
    carbs: 72,
  },

  Картофель: {
    kcal: 77,
    protein: 2,
    fat: 0.1,
    carbs: 17,
  },

  Батат: {
    kcal: 86,
    protein: 1.6,
    fat: 0.1,
    carbs: 20,
  },

  "Оливковое масло": {
    kcal: 884,
    protein: 0,
    fat: 100,
    carbs: 0,
  },

  Мёд: {
    kcal: 304,
    protein: 0.3,
    fat: 0,
    carbs: 82,
  },

  "Арахисовая паста": {
    kcal: 588,
    protein: 25,
    fat: 50,
    carbs: 20,
  },

  Сыр: {
    kcal: 350,
    protein: 25,
    fat: 28,
    carbs: 1,
  },
};

/* =========================================================
   INITIAL RECIPES
========================================================= */

const INITIAL_RECIPES = [
  {
    id: "1",
    title: "Кремовые сырники",
    category: "Завтраки",
    time: 20,
    servings: 2,
    image:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=900",
    description: "Нежные сырники с кремовой текстурой.",
    ingredients: [
      {
        product: "Творог 5%",
        grams: 200,
      },
      {
        product: "Яйцо",
        grams: 50,
      },
      {
        product: "Рисовая мука",
        grams: 30,
      },
    ],
    steps: [
      "Протри творог через сито или пробей блендером.",
      "Добавь яйцо и рисовую муку.",
      "Перемешай до однородной массы.",
      "Сформируй небольшие сырники.",
      "Готовь на слабом огне до золотистой корочки.",
    ],
  },

  {
    id: "2",
    title: "Овсяноблин с бананом",
    category: "Завтраки",
    time: 10,
    servings: 1,
    image:
      "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=900",
    description: "Быстрый и сытный завтрак.",
    ingredients: [
      {
        product: "Овсянка",
        grams: 50,
      },
      {
        product: "Яйцо",
        grams: 50,
      },
      {
        product: "Банан",
        grams: 80,
      },
    ],
    steps: [
      "Измельчи овсянку.",
      "Добавь яйцо и половину банана.",
      "Перемешай.",
      "Обжарь с двух сторон.",
      "Подавай с оставшимся бананом.",
    ],
  },

  {
    id: "3",
    title: "Шоколадный фит-десерт",
    category: "Десерты",
    time: 15,
    servings: 1,
    image:
      "https://images.unsplash.com/photo-1575377427642-087cf684f29d?w=900",
    description: "Шоколадный десерт без лишнего сахара.",
    ingredients: [
      {
        product: "Греческий йогурт",
        grams: 150,
      },
      {
        product: "Какао",
        grams: 10,
      },
      {
        product: "Мёд",
        grams: 10,
      },
    ],
    steps: [
      "Выложи йогурт в миску.",
      "Добавь какао.",
      "Добавь мёд.",
      "Перемешай.",
      "Охлади перед подачей.",
    ],
  },

  {
    id: "4",
    title: "Протеиновая овсянка",
    category: "Завтраки",
    time: 8,
    servings: 1,
    image:
      "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=900",
    description: "Плотный завтрак с хорошим количеством белка.",
    ingredients: [
      {
        product: "Овсянка",
        grams: 50,
      },
      {
        product: "Молоко 2.5%",
        grams: 150,
      },
      {
        product: "Банан",
        grams: 60,
      },
      {
        product: "Арахисовая паста",
        grams: 10,
      },
    ],
    steps: [
      "Смешай овсянку с молоком.",
      "Добавь банан.",
      "Приготовь до мягкости.",
      "Добавь арахисовую пасту.",
    ],
  },

  {
    id: "5",
    title: "Курица с гречкой",
    category: "Обеды",
    time: 30,
    servings: 1,
    image:
      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=900",
    description: "Простой сбалансированный обед.",
    ingredients: [
      {
        product: "Куриная грудка",
        grams: 150,
      },
      {
        product: "Гречка",
        grams: 70,
      },
      {
        product: "Оливковое масло",
        grams: 5,
      },
    ],
    steps: [
      "Отвари гречку.",
      "Нарежь куриную грудку.",
      "Приготовь курицу.",
      "Добавь немного оливкового масла.",
      "Соедини с гречкой.",
    ],
  },

  {
    id: "6",
    title: "Творожный крем с ягодами",
    category: "Десерты",
    time: 5,
    servings: 1,
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900",
    description: "Лёгкий творожный десерт с малиной.",
    ingredients: [
      {
        product: "Творог 5%",
        grams: 150,
      },
      {
        product: "Греческий йогурт",
        grams: 80,
      },
      {
        product: "Малина",
        grams: 70,
      },
      {
        product: "Мёд",
        grams: 5,
      },
    ],
    steps: [
      "Пробей творог с йогуртом.",
      "Добавь мёд.",
      "Выложи малину.",
      "Сверху добавь творожный крем.",
    ],
  },
];

/* =========================================================
   HELPERS
========================================================= */

function num(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function calculateRecipe(recipe, products) {
  const total = {
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  };

  if (!recipe || !Array.isArray(recipe.ingredients)) {
    return {
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      perServing: {
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      },
    };
  }

  recipe.ingredients.forEach((item) => {
    const p = products[item.product];

    if (!p) return;

    const factor = num(item.grams) / 100;

    total.kcal += num(p.kcal) * factor;
    total.protein += num(p.protein) * factor;
    total.fat += num(p.fat) * factor;
    total.carbs += num(p.carbs) * factor;
  });

  const servings = Math.max(1, num(recipe.servings));

  return {
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein * 10) / 10,
    fat: Math.round(total.fat * 10) / 10,
    carbs: Math.round(total.carbs * 10) / 10,

    perServing: {
      kcal: Math.round(total.kcal / servings),
      protein:
        Math.round((total.protein / servings) * 10) / 10,
      fat:
        Math.round((total.fat / servings) * 10) / 10,
      carbs:
        Math.round((total.carbs / servings) * 10) / 10,
    },
  };
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function MacroBox({ label, value }) {
  return (
    <View style={styles.macroBox}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        danger && styles.buttonDanger,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonSecondaryText,
          danger && styles.buttonDangerText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [recipes, setRecipes] = useState(INITIAL_RECIPES);

  const [screen, setScreen] = useState("home");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const [favorites, setFavorites] = useState([]);
  const [diary, setDiary] = useState([]);

  const [authorUnlocked, setAuthorUnlocked] = useState(false);
  const [authorTab, setAuthorTab] = useState("recipes");

  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");

  const [loaded, setLoaded] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  /* =========================================================
     LOAD
  ========================================================= */

 useEffect(() => {
  async function checkAuth() {
    try {
      // 1. Проверяем сохранённую сессию
      const saved = await AsyncStorage.getItem(
        "PACOOK_SESSION"
      );

      if (saved) {
        const session = JSON.parse(saved);

        if (session?.user) {
          setAuthUser(session.user);
          return;
        }
      }

      // 2. Если пользователь только что подтвердил email
      // Supabase передаёт access_token и refresh_token
      // в URL после подтверждения.
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined"
      ) {
        const hash = window.location.hash;

        if (hash) {
          const params = new URLSearchParams(
            hash.substring(1)
          );

          const accessToken =
            params.get("access_token");

          const refreshToken =
            params.get("refresh_token");

          const type = params.get("type");

          if (accessToken) {
            // Получаем пользователя по access token
            const response = await fetch(
              `${SUPABASE_URL}/auth/v1/user`,
              {
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            const user = await response.json();

            if (response.ok && user?.id) {
              await AsyncStorage.setItem(
                "PACOOK_SESSION",
                JSON.stringify({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  user,
                })
              );

              setAuthUser(user);

              // Убираем токены из адресной строки
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );

              return;
            }
          }
        }
      }
    } catch (e) {
      console.log(
        "AUTH SESSION ERROR:",
        e
      );
    } finally {
      setAuthChecked(true);
    }
  }

  checkAuth();
}, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    let localData = null;

    /* -----------------------------------------
       1. Загружаем локальные данные
    ----------------------------------------- */

    try {
      const saved = await AsyncStorage.getItem(
        "PACOOK_DATA"
      );

      if (saved) {
        localData = JSON.parse(saved);

        if (localData.products) {
          setProducts(localData.products);
        }

        if (localData.recipes) {
          setRecipes(localData.recipes);
        }

        if (localData.favorites) {
          setFavorites(localData.favorites);
        }

        if (localData.diary) {
          setDiary(localData.diary);
        }
      }
    } catch (e) {
      console.log("LOCAL LOAD ERROR", e);
    }

    /* -----------------------------------------
       2. Загружаем продукты из Supabase
    ----------------------------------------- */

    try {
      const rows = await getSupabaseProducts();

      if (Array.isArray(rows) && rows.length > 0) {
        const supabaseProducts = {};

        rows.forEach((row) => {
          if (!row.name) return;

          supabaseProducts[row.name] = {
            kcal: num(row.kcal),
            protein: num(row.protein),
            fat: num(row.fat),
            carbs: num(row.carbs),
          };
        });

        /*
          Supabase является источником новых продуктов,
          но локальные продукты сохраняем сверху.
        */

        setProducts((current) => ({
          ...supabaseProducts,
          ...current,
        }));

        console.log(
          "SUPABASE PRODUCTS:",
          rows.length
        );
      }
    } catch (e) {
      console.log(
        "SUPABASE PRODUCTS ERROR:",
        e.message
      );

      /*
        Ошибка Supabase НЕ ломает приложение.
        Остаются локальные продукты.
      */
    }

    setLoaded(true);
  }

  /* =========================================================
     LOCAL SAVE
  ========================================================= */

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      "PACOOK_DATA",
      JSON.stringify({
        products,
        recipes,
        favorites,
        diary,
      })
    ).catch((e) => {
      console.log("SAVE ERROR", e);
    });
  }, [
    products,
    recipes,
    favorites,
    diary,
    loaded,
  ]);

  /* =========================================================
     CATEGORIES
  ========================================================= */

  const categories = useMemo(() => {
    return [
      "Все",
      ...new Set(recipes.map((r) => r.category)),
    ];
  }, [recipes]);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch = String(r.title)
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "Все" ||
      r.category === category;

    return matchesSearch && matchesCategory;
  });

  /* =========================================================
     ACTIONS
  ========================================================= */

  function openRecipe(recipe) {
    setSelectedRecipe(recipe);
    setScreen("recipe");
  }

  function toggleFavorite(id) {
    setFavorites((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function addToDiary(recipe) {
    setDiary((prev) => [...prev, recipe.id]);

    Alert.alert(
      "Добавлено",
      "Рецепт добавлен в дневник."
    );
  }

  function unlockAuthor() {
    setScreen("authorPin");
  }

  function logoutAuthor() {
    setAuthorUnlocked(false);
    setScreen("profile");
  }

  function resetData() {
    Alert.alert(
      "Сбросить данные?",
      "Локальные изменения будут удалены. После этого продукты снова загрузятся из Supabase.",
      [
        {
          text: "Отмена",
          style: "cancel",
        },

        {
          text: "Сбросить",
          style: "destructive",

          onPress: async () => {
            setProducts(INITIAL_PRODUCTS);
            setRecipes(INITIAL_RECIPES);
            setFavorites([]);
            setDiary([]);

            await AsyncStorage.removeItem(
              "PACOOK_DATA"
            );

            Alert.alert(
              "Готово",
              "Локальные данные сброшены."
            );
          },
        },
      ]
    );
  }

  /* =========================================================
     HOME
  ========================================================= */

  function Home() {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.logo}>
                PaCook
              </Text>

              <Text style={styles.tagline}>
                Cook smart. Eat better.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.profileCircle}
              onPress={() =>
                setScreen("profile")
              }
            >
              <Text>👤</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroSmall}>
              ТВОЙ УМНЫЙ КУХОННЫЙ ПОМОЩНИК
            </Text>

            <Text style={styles.heroTitle}>
              Ешь вкусно.
              {"\n"}
              Считай легко.
            </Text>

            <Text style={styles.heroText}>
              Рецепты, КБЖУ и дневник питания
              в одном приложении.
            </Text>
          </View>

          <TextInput
            placeholder="Поиск рецептов..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.search}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            {categories.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setCategory(item)}
                style={[
                  styles.category,
                  category === item &&
                    styles.categoryActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === item &&
                      styles.categoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Рецепты
            </Text>

            <Text style={styles.sectionCount}>
              {filteredRecipes.length}
            </Text>
          </View>

          {filteredRecipes.map((recipe) => {
            const macros = calculateRecipe(
              recipe,
              products
            );

            return (
              <TouchableOpacity
                key={recipe.id}
                style={styles.recipeCard}
                onPress={() =>
                  openRecipe(recipe)
                }
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: recipe.image }}
                  style={styles.recipeImage}
                />

                <View style={styles.recipeInfo}>
                  <Text
                    style={styles.recipeCategory}
                  >
                    {recipe.category}
                  </Text>

                  <Text
                    style={styles.recipeTitle}
                  >
                    {recipe.title}
                  </Text>

                  <Text
                    style={styles.recipeDescription}
                  >
                    {recipe.description}
                  </Text>

                  <View
                    style={styles.recipeBottom}
                  >
                    <Text style={styles.time}>
                      ◷ {recipe.time} мин
                    </Text>

                    <Text style={styles.kcal}>
                      {macros.perServing.kcal} ккал
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredRecipes.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>
                🔎
              </Text>

              <Text style={styles.emptyTitle}>
                Ничего не найдено
              </Text>

              <Text style={styles.emptyText}>
                Попробуй изменить поиск или
                категорию.
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomNav />
      </SafeAreaView>
    );
  }

  /* =========================================================
     RECIPE
  ========================================================= */

  function RecipeScreen() {
    if (!selectedRecipe) return null;

    const recipe = recipes.find(
      (r) => r.id === selectedRecipe.id
    );

    if (!recipe) return null;

    const macros = calculateRecipe(
      recipe,
      products
    );

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
          }}
        >
          <Image
            source={{ uri: recipe.image }}
            style={styles.detailImage}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreen("home")}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.detailContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.detailCategory}>
                {recipe.category}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  toggleFavorite(recipe.id)
                }
                style={styles.favoriteButton}
              >
                <Text
                  style={{ fontSize: 22 }}
                >
                  {favorites.includes(
                    recipe.id
                  )
                    ? "♥"
                    : "♡"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.detailTitle}>
              {recipe.title}
            </Text>

            <Text
              style={styles.detailDescription}
            >
              {recipe.description}
            </Text>

            <View style={styles.macroRow}>
              <MacroBox
                label="ККАЛ"
                value={
                  macros.perServing.kcal
                }
              />

              <MacroBox
                label="БЕЛКИ"
                value={`${macros.perServing.protein} г`}
              />

              <MacroBox
                label="ЖИРЫ"
                value={`${macros.perServing.fat} г`}
              />

              <MacroBox
                label="УГЛ."
                value={`${macros.perServing.carbs} г`}
              />
            </View>

            <View style={styles.infoRow}>
              <Text>
                ⏱ {recipe.time} мин
              </Text>

              <Text>
                🍽 {recipe.servings} порц.
              </Text>
            </View>

            <Text
              style={styles.detailSectionTitle}
            >
              Ингредиенты
            </Text>

            {recipe.ingredients.map(
              (item, index) => (
                <View
                  key={index}
                  style={styles.ingredientRow}
                >
                  <Text
                    style={
                      styles.ingredientName
                    }
                  >
                    {item.product}
                  </Text>

                  <Text
                    style={
                      styles.ingredientGrams
                    }
                  >
                    {item.grams} г
                  </Text>
                </View>
              )
            )}

            <Text
              style={styles.detailSectionTitle}
            >
              Приготовление
            </Text>

            {recipe.steps.map(
              (step, index) => (
                <View
                  key={index}
                  style={styles.stepRow}
                >
                  <View
                    style={styles.stepNumber}
                  >
                    <Text
                      style={
                        styles.stepNumberText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <Text
                    style={styles.stepText}
                  >
                    {step}
                  </Text>
                </View>
              )
            )}

            <Button
              title="＋ Добавить в дневник"
              onPress={() =>
                addToDiary(recipe)
              }
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* =========================================================
     CALCULATOR
  ========================================================= */

  function Calculator() {
    const [product, setProduct] =
      useState(
        Object.keys(products)[0] || ""
      );

    const [grams, setGrams] =
      useState("100");

    const data = products[product];

    const factor = num(grams) / 100;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={
            styles.container
          }
        >
          <Text style={styles.pageTitle}>
            Калькулятор КБЖУ
          </Text>

          <Text style={styles.pageSubtitle}>
            Посчитай пищевую ценность
            любого продукта.
          </Text>

          <Text style={styles.label}>
            Продукт
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
          >
            {Object.keys(products).map(
              (name) => (
                <TouchableOpacity
                  key={name}
                  onPress={() =>
                    setProduct(name)
                  }
                  style={[
                    styles.productChip,
                    product === name &&
                      styles.productChipActive,
                  ]}
                >
                  <Text
                    style={
                      product === name
                        ? styles.productChipActiveText
                        : styles.productChipText
                    }
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>

          <Text style={styles.label}>
            Вес, граммы
          </Text>

          <TextInput
            value={grams}
            onChangeText={setGrams}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          {data && (
            <View
              style={styles.calculatorCard}
            >
              <Text
                style={
                  styles.calculatorProduct
                }
              >
                {product}
              </Text>

              <View style={styles.macroRow}>
                <MacroBox
                  label="ККАЛ"
                  value={Math.round(
                    data.kcal * factor
                  )}
                />

                <MacroBox
                  label="Б"
                  value={`${
                    Math.round(
                      data.protein *
                        factor *
                        10
                    ) / 10
                  }`}
                />

                <MacroBox
                  label="Ж"
                  value={`${
                    Math.round(
                      data.fat *
                        factor *
                        10
                    ) / 10
                  }`}
                />

                <MacroBox
                  label="У"
                  value={`${
                    Math.round(
                      data.carbs *
                        factor *
                        10
                    ) / 10
                  }`}
                />
              </View>
            </View>
          )}
        </ScrollView>

        <BottomNav />
      </SafeAreaView>
    );
  }

  /* =========================================================
     DIARY
  ========================================================= */

  function Diary() {
  const days = [
    "Пн",
    "Вт",
    "Ср",
    "Чт",
    "Пт",
    "Сб",
    "Вс",
  ];

  const defaultMealTypes = [
    {
      id: "breakfast",
      title: "Завтрак",
      defaultTime: "08:00",
      enabled: true,
    },
    {
      id: "snack1",
      title: "Перекус",
      defaultTime: "11:00",
      enabled: true,
    },
    {
      id: "lunch",
      title: "Обед",
      defaultTime: "14:00",
      enabled: true,
    },
    {
      id: "snack2",
      title: "Перекус",
      defaultTime: "17:00",
      enabled: true,
    },
    {
      id: "dinner",
      title: "Ужин",
      defaultTime: "20:00",
      enabled: true,
    },
  ];

  const timeOptions = [
    "06:00",
    "06:30",
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
  ];

  const todayIndex =
    new Date().getDay() === 0
      ? 6
      : new Date().getDay() - 1;

  const [selectedDay, setSelectedDay] =
    useState(todayIndex);

  const [weeklyDiary, setWeeklyDiary] =
    useState(null);

  const [dailyCalories, setDailyCalories] =
    useState([
      2200,
      2200,
      2200,
      2200,
      2200,
      2200,
      2200,
    ]);

  const [showRecipes, setShowRecipes] =
    useState(null);

  const [loaded, setLoaded] =
    useState(false);

  const [editingSchedule, setEditingSchedule] =
    useState(false);

  const [mealSettings, setMealSettings] =
    useState(defaultMealTypes);

  const [selectedTimeMeal, setSelectedTimeMeal] =
    useState(null);

  function createEmptyWeek() {
    return days.map(() =>
      defaultMealTypes.reduce(
        (result, meal) => {
          result[meal.id] = {
            time: meal.defaultTime,
            recipes: [],
          };

          return result;
        },
        {}
      )
    );
  }

  function migrateDiary(oldDiary) {
    const emptyWeek = createEmptyWeek();

    if (!Array.isArray(oldDiary)) {
      return emptyWeek;
    }

    oldDiary.forEach((dayData, dayIndex) => {
      if (dayIndex >= days.length) return;

      if (
        dayData &&
        typeof dayData === "object" &&
        !Array.isArray(dayData)
      ) {
        defaultMealTypes.forEach((meal) => {
          if (dayData[meal.id]) {
            emptyWeek[dayIndex][meal.id] = {
              time:
                dayData[meal.id].time ||
                meal.defaultTime,

              recipes: Array.isArray(
                dayData[meal.id].recipes
              )
                ? dayData[meal.id].recipes
                : [],
            };
          }
        });

        return;
      }

      if (Array.isArray(dayData)) {
        dayData.forEach((recipeId, index) => {
          const meal =
            defaultMealTypes[
              Math.min(
                index,
                defaultMealTypes.length - 1
              )
            ];

          if (meal) {
            emptyWeek[dayIndex][
              meal.id
            ].recipes.push(recipeId);
          }
        });
      }
    });

    return emptyWeek;
  }

  useEffect(() => {
    async function loadDiary() {
      try {
        const savedDiary =
          await AsyncStorage.getItem(
            "PACOOK_WEEKLY_DIARY"
          );

        const savedCalories =
          await AsyncStorage.getItem(
            "PACOOK_DAILY_CALORIES"
          );

        const savedSchedule =
          await AsyncStorage.getItem(
            "PACOOK_MEAL_SETTINGS"
          );

        if (savedDiary) {
          setWeeklyDiary(
            migrateDiary(
              JSON.parse(savedDiary)
            )
          );
        } else {
          const emptyWeek =
            createEmptyWeek();

          if (
            typeof diary !== "undefined" &&
            Array.isArray(diary)
          ) {
            emptyWeek[todayIndex].breakfast.recipes =
              diary;
          }

          setWeeklyDiary(emptyWeek);
        }

        if (savedCalories) {
          try {
            const parsedCalories =
              JSON.parse(savedCalories);

            if (
              Array.isArray(parsedCalories) &&
              parsedCalories.length === 7
            ) {
              setDailyCalories(
                parsedCalories
              );
            }
          } catch (error) {}
        }

        if (savedSchedule) {
          try {
            const parsedSchedule =
              JSON.parse(savedSchedule);

            if (
              Array.isArray(parsedSchedule)
            ) {
              setMealSettings(
                parsedSchedule
              );
            }
          } catch (error) {}
        }
      } catch (error) {
        console.log(
          "Ошибка загрузки дневника:",
          error
        );

        setWeeklyDiary(
          createEmptyWeek()
        );
      }

      setLoaded(true);
    }

    loadDiary();
  }, []);

  useEffect(() => {
    if (!loaded || !weeklyDiary) return;

    AsyncStorage.setItem(
      "PACOOK_WEEKLY_DIARY",
      JSON.stringify(weeklyDiary)
    );
  }, [weeklyDiary, loaded]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      "PACOOK_DAILY_CALORIES",
      JSON.stringify(dailyCalories)
    );
  }, [dailyCalories, loaded]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      "PACOOK_MEAL_SETTINGS",
      JSON.stringify(mealSettings)
    );
  }, [mealSettings, loaded]);

  if (!loaded || !weeklyDiary) {
    return (
      <SafeAreaView style={styles.safe}>
        <View
          style={[
            styles.container,
            {
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text style={styles.pageTitle}>
            Загружаем дневник...
          </Text>
        </View>

        <BottomNav />
      </SafeAreaView>
    );
  }

  const currentDay =
    weeklyDiary[selectedDay] || {};

  const visibleMeals =
    mealSettings.filter(
      (meal) => meal.enabled
    );

  const allTodayRecipes = [];

  visibleMeals.forEach((meal) => {
    const slot =
      currentDay[meal.id];

    if (!slot) return;

    const ids = Array.isArray(
      slot.recipes
    )
      ? slot.recipes
      : [];

    ids.forEach((recipeId) => {
      const recipe =
        recipes.find(
          (item) =>
            item.id === recipeId
        );

      if (recipe) {
        allTodayRecipes.push({
          recipe,
          mealId: meal.id,
        });
      }
    });
  });

  let kcal = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;

  allTodayRecipes.forEach(
    ({ recipe }) => {
      const macros =
        calculateRecipe(
          recipe,
          products
        ).perServing;

      kcal += macros.kcal;
      protein += macros.protein;
      fat += macros.fat;
      carbs += macros.carbs;
    }
  );

  const targetCalories =
    dailyCalories[selectedDay] || 0;

  const remainingCalories =
    targetCalories - kcal;

  function addRecipe(
    recipe,
    mealId
  ) {
    setWeeklyDiary((prev) => {
      const copy = prev.map(
        (day) => ({
          ...day,
          [mealId]: {
            ...day[mealId],
            recipes: [
              ...(day[mealId]
                ?.recipes || []),
              recipe.id,
            ],
          },
        })
      );

      return copy;
    });

    setShowRecipes(null);
  }

  function removeRecipe(
    mealId,
    recipeIndex
  ) {
    setWeeklyDiary((prev) => {
      const copy = prev.map(
        (day) => ({
          ...day,
          [mealId]: {
            ...day[mealId],
            recipes: [
              ...(day[mealId]
                ?.recipes || []),
            ],
          },
        })
      );

      copy[selectedDay][
        mealId
      ].recipes.splice(
        recipeIndex,
        1
      );

      return copy;
    });
  }

  function changeCalories(value) {
    const number = Number(
      value.replace(/[^0-9]/g, "")
    );

    setDailyCalories((prev) => {
      const copy = [...prev];

      copy[selectedDay] =
        number || 0;

      return copy;
    });
  }

  function toggleMeal(mealId) {
    setMealSettings((prev) =>
      prev.map((meal) =>
        meal.id === mealId
          ? {
              ...meal,
              enabled: !meal.enabled,
            }
          : meal
      )
    );
  }

  function changeMealTime(
    mealId,
    time
  ) {
    setMealSettings((prev) =>
      prev.map((meal) =>
        meal.id === mealId
          ? {
              ...meal,
              defaultTime: time,
            }
          : meal
      )
    );

    setWeeklyDiary((prev) =>
      prev.map((day) => ({
        ...day,
        [mealId]: {
          ...day[mealId],
          time,
        },
      }))
    );

    setSelectedTimeMeal(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
      >
        <Text style={styles.pageTitle}>
          Дневник
        </Text>

        <Text style={styles.pageSubtitle}>
          Твоё питание на неделю.
        </Text>

        {/* ДНИ */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          style={{
            marginBottom: 18,
          }}
        >
          {days.map(
            (day, index) => (
              <TouchableOpacity
                key={day}
                onPress={() =>
                  setSelectedDay(
                    index
                  )
                }
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  marginRight: 8,
                  borderRadius: 14,
                  backgroundColor:
                    selectedDay ===
                    index
                      ? COLORS.green
                      : COLORS.card,
                }}
              >
                <Text
                  style={{
                    color:
                      selectedDay ===
                      index
                        ? "#fff"
                        : COLORS.text,
                    fontWeight:
                      "700",
                  }}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* НАСТРОЙКА РАСПИСАНИЯ */}

        <TouchableOpacity
          onPress={() =>
            setEditingSchedule(
              !editingSchedule
            )
          }
          style={{
            backgroundColor:
              COLORS.card,
            borderRadius: 16,
            paddingVertical: 15,
            paddingHorizontal: 16,
            marginBottom: 14,
            borderWidth: 1,
            borderColor:
              COLORS.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
              "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color:
                  COLORS.text,
              }}
            >
              ⚙️ Настроить расписание
            </Text>

            <Text
              style={{
                color:
                  COLORS.muted,
                marginTop: 3,
              }}
            >
              Приёмы пищи и время
            </Text>
          </View>

          <Text
            style={{
              fontSize: 22,
              color:
                COLORS.green,
            }}
          >
            {editingSchedule
              ? "⌃"
              : "›"}
          </Text>
        </TouchableOpacity>

        {/* РЕДАКТОР РАСПИСАНИЯ */}

        {editingSchedule && (
          <View
            style={{
              backgroundColor:
                COLORS.card,
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor:
                COLORS.border,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color:
                  COLORS.text,
                marginBottom: 5,
              }}
            >
              Моё расписание
            </Text>

            <Text
              style={{
                color:
                  COLORS.muted,
                marginBottom: 16,
              }}
            >
              Выбери нужные приёмы пищи
              и установи время.
            </Text>

            {mealSettings.map(
              (meal) => (
                <View
                  key={meal.id}
                  style={{
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection:
                        "row",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      backgroundColor:
                        COLORS.background,
                      borderRadius: 14,
                      padding: 13,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight:
                            "800",
                          color:
                            COLORS.text,
                        }}
                      >
                        {meal.title}
                      </Text>

                      <TouchableOpacity
                        onPress={() =>
                          setSelectedTimeMeal(
                            selectedTimeMeal ===
                              meal.id
                              ? null
                              : meal.id
                          )
                        }
                      >
                        <Text
                          style={{
                            color:
                              COLORS.green,
                            fontWeight:
                              "700",
                            marginTop: 4,
                          }}
                        >
                          🕐{" "}
                          {meal.defaultTime}
                          {"  "}Изменить
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Switch
                      value={
                        meal.enabled
                      }
                      onValueChange={() =>
                        toggleMeal(
                          meal.id
                        )
                      }
                    />
                  </View>

                  {/* ВЫБОР ВРЕМЕНИ */}

                  {selectedTimeMeal ===
                    meal.id && (
                    <View
                      style={{
                        marginTop: 8,
                        backgroundColor:
                          COLORS.background,
                        borderRadius: 14,
                        padding: 10,
                        maxHeight: 170,
                      }}
                    >
                      <ScrollView>
                        {timeOptions.map(
                          (time) => (
                            <TouchableOpacity
                              key={time}
                              onPress={() =>
                                changeMealTime(
                                  meal.id,
                                  time
                                )
                              }
                              style={{
                                paddingVertical:
                                  10,
                                paddingHorizontal:
                                  12,
                                borderRadius: 10,
                                backgroundColor:
                                  meal.defaultTime ===
                                  time
                                    ? COLORS.green
                                    : "transparent",
                                marginBottom:
                                  3,
                              }}
                            >
                              <Text
                                style={{
                                  color:
                                    meal.defaultTime ===
                                    time
                                      ? "#fff"
                                      : COLORS.text,
                                  fontWeight:
                                    "700",
                                }}
                              >
                                {time}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )
            )}
          </View>
        )}

        {/* ЦЕЛЬ */}

        <View
          style={[
            styles.calculatorCard,
            {
              marginBottom: 14,
            },
          ]}
        >
          <Text
            style={styles.smallCaps}
          >
            ЦЕЛЬ НА{" "}
            {days[
              selectedDay
            ].toUpperCase()}
          </Text>

          <TextInput
            value={String(
              targetCalories
            )}
            onChangeText={
              changeCalories
            }
            keyboardType="numeric"
            style={{
              fontSize: 30,
              fontWeight: "800",
              color: COLORS.text,
              marginTop: 6,
              padding: 0,
            }}
          />

          <Text
            style={{
              color: COLORS.muted,
              marginTop: 2,
            }}
          >
            ккал в день
          </Text>
        </View>

        {/* ИТОГ */}

        <View
          style={styles.calculatorCard}
        >
          <Text
            style={styles.smallCaps}
          >
            {days[
              selectedDay
            ].toUpperCase()}
          </Text>

          <Text
            style={styles.bigCalories}
          >
            {Math.round(kcal)} ккал
          </Text>

          <Text
            style={{
              color:
                remainingCalories >=
                0
                  ? COLORS.green
                  : "#D9534F",
              fontWeight: "700",
              marginBottom: 14,
            }}
          >
            {remainingCalories >=
            0
              ? `Осталось ${Math.round(
                  remainingCalories
                )} ккал`
              : `Превышено на ${Math.round(
                  Math.abs(
                    remainingCalories
                  )
                )} ккал`}
          </Text>

          <View
            style={styles.macroRow}
          >
            <MacroBox
              label="БЕЛКИ"
              value={`${
                Math.round(
                  protein * 10
                ) / 10
              } г`}
            />

            <MacroBox
              label="ЖИРЫ"
              value={`${
                Math.round(
                  fat * 10
                ) / 10
              } г`}
            />

            <MacroBox
              label="УГЛ."
              value={`${
                Math.round(
                  carbs * 10
                ) / 10
              } г`}
            />
          </View>
        </View>

        {/* РАСПИСАНИЕ ДНЯ */}

        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: COLORS.text,
            marginTop: 22,
            marginBottom: 12,
          }}
        >
          Расписание
        </Text>

        {visibleMeals.map(
          (meal) => {
            const slot =
              currentDay[
                meal.id
              ] || {
                time:
                  meal.defaultTime,
                recipes: [],
              };

            const slotRecipes =
              Array.isArray(
                slot.recipes
              )
                ? slot.recipes
                    .map(
                      (id) =>
                        recipes.find(
                          (recipe) =>
                            recipe.id ===
                            id
                        )
                    )
                    .filter(Boolean)
                : [];

            return (
              <View
                key={meal.id}
                style={{
                  backgroundColor:
                    COLORS.card,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor:
                    COLORS.border,
                }}
              >
                <View
                  style={{
                    flexDirection:
                      "row",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    marginBottom: 12,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight:
                          "800",
                        color:
                          COLORS.text,
                      }}
                    >
                      {meal.title}
                    </Text>

                    <Text
                      style={{
                        color:
                          COLORS.muted,
                        marginTop: 3,
                      }}
                    >
                      🕐{" "}
                      {slot.time ||
                        meal.defaultTime}
                    </Text>
                  </View>
                </View>

                {slotRecipes.length ===
                0 ? (
                  <Text
                    style={{
                      color:
                        COLORS.muted,
                      marginBottom: 10,
                    }}
                  >
                    Блюдо ещё не
                    добавлено
                  </Text>
                ) : (
                  slotRecipes.map(
                    (
                      recipe,
                      recipeIndex
                    ) => (
                      <View
                        key={`${recipe.id}-${recipeIndex}`}
                        style={{
                          flexDirection:
                            "row",
                          alignItems:
                            "center",
                          paddingVertical:
                            10,
                          borderTopWidth:
                            1,
                          borderTopColor:
                            COLORS.border,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            openRecipe(
                              recipe
                            )
                          }
                          style={{
                            flex: 1,
                            flexDirection:
                              "row",
                            alignItems:
                              "center",
                          }}
                        >
                          <Image
                            source={{
                              uri: recipe.image,
                            }}
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 12,
                              marginRight: 10,
                            }}
                          />

                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight:
                                  "700",
                                color:
                                  COLORS.text,
                              }}
                            >
                              {
                                recipe.title
                              }
                            </Text>

                            <Text
                              style={{
                                color:
                                  COLORS.muted,
                                marginTop: 3,
                              }}
                            >
                              {Math.round(
                                calculateRecipe(
                                  recipe,
                                  products
                                )
                                  .perServing
                                  .kcal
                              )}{" "}
                              ккал
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            removeRecipe(
                              meal.id,
                              recipeIndex
                            )
                          }
                          style={{
                            padding: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 20,
                            }}
                          >
                            🗑️
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )
                  )
                )}

                <TouchableOpacity
                  onPress={() =>
                    setShowRecipes(
                      showRecipes ===
                        meal.id
                        ? null
                        : meal.id
                    )
                  }
                  style={{
                    backgroundColor:
                      COLORS.green,
                    borderRadius: 12,
                    paddingVertical:
                      11,
                    alignItems:
                      "center",
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight:
                        "800",
                    }}
                  >
                    {showRecipes ===
                    meal.id
                      ? "Закрыть"
                      : "+ Добавить блюдо"}
                  </Text>
                </TouchableOpacity>

                {showRecipes ===
                  meal.id && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor:
                        COLORS.background,
                      borderRadius: 14,
                      padding: 10,
                    }}
                  >
                    {recipes.map(
                      (recipe) => (
                        <TouchableOpacity
                          key={
                            recipe.id
                          }
                          onPress={() =>
                            addRecipe(
                              recipe,
                              meal.id
                            )
                          }
                          style={{
                            paddingVertical:
                              12,
                            borderBottomWidth:
                              1,
                            borderBottomColor:
                              COLORS.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight:
                                "700",
                              color:
                                COLORS.text,
                            }}
                          >
                            {
                              recipe.title
                            }
                          </Text>

                          <Text
                            style={{
                              color:
                                COLORS.muted,
                              marginTop: 3,
                            }}
                          >
                            {Math.round(
                              calculateRecipe(
                                recipe,
                                products
                              )
                                .perServing
                                .kcal
                            )}{" "}
                            ккал
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
              </View>
            );
          }
        )}

        {visibleMeals.length ===
          0 && (
          <View
            style={styles.empty}
          >
            <Text
              style={styles.emptyEmoji}
            >
              🍽️
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              Расписание пустое
            </Text>

            <Text
              style={styles.emptyText}
            >
              В настройках включи хотя бы
              один приём пищи.
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

  /* =========================================================
     PROFILE
  ========================================================= */

  function Profile() {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={
            styles.container
          }
        >
          <Text style={styles.pageTitle}>
            Профиль
          </Text>

          <View
            style={styles.profileCard}
          >
            <View
              style={
                styles.largeProfileCircle
              }
            >
              <Text
                style={{ fontSize: 32 }}
              >
                👨‍🍳
              </Text>
            </View>

            <Text
              style={styles.profileName}
            >
              {authUser?.user_metadata?.name || "PaCook User"}
            </Text>

            <Text
              style={styles.profileEmail}
            >
              {authUser?.email || "Твой персональный профиль"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileOption}
            onPress={unlockAuthor}
          >
            <Text
              style={styles.optionIcon}
            >
              ⚙️
            </Text>

            <View
              style={{ flex: 1 }}
            >
              <Text
                style={styles.optionTitle}
              >
                Режим автора
              </Text>

              <Text
                style={styles.optionText}
              >
                Управление рецептами и
                продуктами
              </Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity>

          <View
            style={styles.statsCard}
          >
            <Text
              style={styles.optionTitle}
            >
              Моя PaCook
            </Text>

            <View style={styles.statRow}>
              <Text>Рецептов</Text>

              <Text
                style={styles.statValue}
              >
                {recipes.length}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text>Продуктов</Text>

              <Text
                style={styles.statValue}
              >
                {Object.keys(
                  products
                ).length}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text>В дневнике</Text>

              <Text
                style={styles.statValue}
              >
                {diary.length}
              </Text>
            </View>
          </View>
          <Button
  title="Выйти из аккаунта"
  danger
  onPress={logoutUser}
/>
        </ScrollView>

        <BottomNav />
      </SafeAreaView>
    );
  }

  /* =========================================================
     AUTHOR PIN
  ========================================================= */

  function AuthorPin() {
    const [pin, setPin] =
      useState("");

    function checkPin() {
      if (pin === "1465") {
        setAuthorUnlocked(true);
        setScreen("author");
        setPin("");
      } else {
        Alert.alert(
          "Ошибка",
          "Неверный PIN."
        );

        setPin("");
      }
    }

    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
          style={{ flex: 1 }}
        >
          <View
            style={styles.pinContainer}
          >
            <Text style={styles.pinIcon}>
              🔐
            </Text>

            <Text
              style={styles.pageTitle}
            >
              Режим автора
            </Text>

            <Text
              style={styles.pageSubtitle}
            >
              Введи PIN для управления
              PaCook.
            </Text>

            <TextInput
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              style={styles.pinInput}
            />

            <Button
              title="Войти"
              onPress={checkPin}
            />

            <Button
              title="Назад"
              secondary
              onPress={() =>
                setScreen("profile")
              }
            />

            <Text
              style={styles.pinHint}
            >
              Демо PIN: 1465
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* =========================================================
     AUTHOR PANEL
  ========================================================= */

  function Author() {
    if (!authorUnlocked) {
      setScreen("authorPin");
      return null;
    }

    return (
      <SafeAreaView style={styles.safe}>
        <View
          style={styles.authorHeader}
        >
          <View>
            <Text
              style={styles.authorTitle}
            >
              PaCook Admin
            </Text>

            <Text
              style={styles.authorSubtitle}
            >
              Управление приложением
            </Text>
          </View>

          <TouchableOpacity
            onPress={logoutAuthor}
          >
            <Text
              style={styles.logout}
            >
              Выйти
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.authorTabs}
        >
          <TouchableOpacity
            onPress={() =>
              setAuthorTab("recipes")
            }
            style={[
              styles.authorTab,
              authorTab ===
                "recipes" &&
                styles.authorTabActive,
            ]}
          >
            <Text
              style={[
                styles.authorTabText,
                authorTab ===
                  "recipes" &&
                  styles.authorTabTextActive,
              ]}
            >
              Рецепты
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              setAuthorTab("products")
            }
            style={[
              styles.authorTab,
              authorTab ===
                "products" &&
                styles.authorTabActive,
            ]}
          >
            <Text
              style={[
                styles.authorTabText,
                authorTab ===
                  "products" &&
                  styles.authorTabTextActive,
              ]}
            >
              Продукты
            </Text>
          </TouchableOpacity>
        </View>

        {authorTab === "recipes" ? (
          <AuthorRecipes />
        ) : (
          <AuthorProducts />
        )}
      </SafeAreaView>
    );
  }

  /* =========================================================
     AUTHOR RECIPES
  ========================================================= */

  function AuthorRecipes() {
    if (editingRecipe) {
      return (
        <RecipeEditor
          recipe={editingRecipe}
          onClose={() =>
            setEditingRecipe(null)
          }
        />
      );
    }

    return (
      <ScrollView
        contentContainerStyle={
          styles.authorContent
        }
      >
        <Button
          title="＋ Новый рецепт"
          onPress={() =>
            setEditingRecipe({
              id: String(Date.now()),
              title: "",
              category: "Завтраки",
              time: 15,
              servings: 1,
              image:
                "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=900",
              description: "",
              ingredients: [
                {
                  product:
                    Object.keys(
                      products
                    )[0] || "",
                  grams: 100,
                },
              ],
              steps: [""],
            })
          }
        />

        <Text
          style={styles.adminSectionTitle}
        >
          Твои рецепты
        </Text>

        {recipes.map((recipe) => {
          const macros =
            calculateRecipe(
              recipe,
              products
            );

          return (
            <View
              key={recipe.id}
              style={styles.adminCard}
            >
              <Image
                source={{
                  uri: recipe.image,
                }}
                style={styles.adminImage}
              />

              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={styles.adminTitle}
                >
                  {recipe.title}
                </Text>

                <Text
                  style={styles.adminMeta}
                >
                  {recipe.category} ·{" "}
                  {
                    macros.perServing
                      .kcal
                  }{" "}
                  ккал
                </Text>

                <View
                  style={styles.adminActions}
                >
                  <TouchableOpacity
                    style={
                      styles.editButton
                    }
                    onPress={() =>
                      setEditingRecipe({
                        ...recipe,
                        ingredients:
                          recipe.ingredients.map(
                            (x) => ({
                              ...x,
                            })
                          ),
                        steps: [
                          ...recipe.steps,
                        ],
                      })
                    }
                  >
                    <Text
                      style={
                        styles.editButtonText
                      }
                    >
                      Изменить
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.deleteButton
                    }
                    onPress={() => {
                      Alert.alert(
                        "Удалить рецепт?",
                        recipe.title,
                        [
                          {
                            text: "Отмена",
                            style:
                              "cancel",
                          },

                          {
                            text: "Удалить",
                            style:
                              "destructive",

                            onPress: () =>
                              setRecipes(
                                (prev) =>
                                  prev.filter(
                                    (r) =>
                                      r.id !==
                                      recipe.id
                                  )
                              ),
                          },
                        ]
                      );
                    }}
                  >
                    <Text
                      style={
                        styles.deleteButtonText
                      }
                    >
                      Удалить
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        <Button
          title="Сбросить всё до исходных данных"
          secondary
          danger
          onPress={resetData}
        />
      </ScrollView>
    );
  }

  /* =========================================================
     RECIPE EDITOR
  ========================================================= */

  function RecipeEditor({
    recipe,
    onClose,
  }) {
    const [form, setForm] =
      useState(recipe);

    const productNames =
      Object.keys(products);

    function update(key, value) {
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    }

    function updateIngredient(
      index,
      key,
      value
    ) {
      setForm((prev) => {
        const ingredients = [
          ...prev.ingredients,
        ];

        ingredients[index] = {
          ...ingredients[index],
          [key]: value,
        };

        return {
          ...prev,
          ingredients,
        };
      });
    }

    function addIngredient() {
      setForm((prev) => ({
        ...prev,

        ingredients: [
          ...prev.ingredients,
          {
            product:
              productNames[0] || "",
            grams: 100,
          },
        ],
      }));
    }

    function removeIngredient(
      index
    ) {
      setForm((prev) => ({
        ...prev,

        ingredients:
          prev.ingredients.filter(
            (_, i) => i !== index
          ),
      }));
    }

    function updateStep(
      index,
      value
    ) {
      setForm((prev) => {
        const steps = [
          ...prev.steps,
        ];

        steps[index] = value;

        return {
          ...prev,
          steps,
        };
      });
    }

    function addStep() {
      setForm((prev) => ({
        ...prev,

        steps: [
          ...prev.steps,
          "",
        ],
      }));
    }

    function removeStep(index) {
      setForm((prev) => ({
        ...prev,

        steps:
          prev.steps.filter(
            (_, i) =>
              i !== index
          ),
      }));
    }

    function saveRecipe() {
      if (!form.title.trim()) {
        Alert.alert(
          "Ошибка",
          "Введи название рецепта."
        );

        return;
      }

      const clean = {
        ...form,

        title: form.title.trim(),

        category:
          form.category.trim() ||
          "Другое",

        time: Math.max(
          1,
          num(form.time)
        ),

        servings: Math.max(
          1,
          num(form.servings)
        ),

        ingredients:
          form.ingredients.filter(
            (x) =>
              x.product &&
              num(x.grams) > 0
          ),

        steps:
          form.steps.filter(
            (x) => x.trim()
          ),
      };

      setRecipes((prev) => {
        const exists = prev.some(
          (r) =>
            r.id === clean.id
        );

        if (exists) {
          return prev.map((r) =>
            r.id === clean.id
              ? clean
              : r
          );
        }

        return [
          clean,
          ...prev,
        ];
      });

      setEditingRecipe(null);

      Alert.alert(
        "Сохранено",
        "Рецепт обновлён."
      );
    }

    const preview =
      calculateRecipe(
        form,
        products
      );

    return (
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={
            styles.editor
          }
        >
          <TouchableOpacity
            onPress={onClose}
          >
            <Text
              style={
                styles.closeEditor
              }
            >
              ‹ Назад
            </Text>
          </TouchableOpacity>

          <Text
            style={styles.editorTitle}
          >
            {form.title
              ? "Редактирование"
              : "Новый рецепт"}
          </Text>

          <Text
            style={styles.label}
          >
            Название
          </Text>

          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) =>
              update("title", v)
            }
            placeholder="Например: ПП чизкейк"
          />

          <Text
            style={styles.label}
          >
            Категория
          </Text>

          <TextInput
            style={styles.input}
            value={form.category}
            onChangeText={(v) =>
              update(
                "category",
                v
              )
            }
            placeholder="Завтраки"
          />

          <Text
            style={styles.label}
          >
            Описание
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            value={form.description}
            onChangeText={(v) =>
              update(
                "description",
                v
              )
            }
            multiline
            placeholder="Короткое описание"
          />

          <Text
            style={styles.label}
          >
            Фото URL
          </Text>

          <TextInput
            style={styles.input}
            value={form.image}
            onChangeText={(v) =>
              update("image", v)
            }
            autoCapitalize="none"
            placeholder="https://..."
          />

          <View
            style={styles.twoInputs}
          >
            <View
              style={{ flex: 1 }}
            >
              <Text
                style={styles.label}
              >
                Минуты
              </Text>

              <TextInput
                style={styles.input}
                value={String(
                  form.time
                )}
                onChangeText={(v) =>
                  update("time", v)
                }
                keyboardType="number-pad"
              />
            </View>

            <View
              style={{ flex: 1 }}
            >
              <Text
                style={styles.label}
              >
                Порции
              </Text>

              <TextInput
                style={styles.input}
                value={String(
                  form.servings
                )}
                onChangeText={(v) =>
                  update(
                    "servings",
                    v
                  )
                }
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text
            style={styles.editorSection}
          >
            Ингредиенты
          </Text>

          {form.ingredients.map(
            (item, index) => (
              <View
                key={index}
                style={
                  styles.ingredientEditor
                }
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                >
                  {productNames.map(
                    (name) => (
                      <TouchableOpacity
                        key={name}
                        onPress={() =>
                          updateIngredient(
                            index,
                            "product",
                            name
                          )
                        }
                        style={[
                          styles.productChip,
                          item.product ===
                            name &&
                            styles.productChipActive,
                        ]}
                      >
                        <Text
                          style={
                            item.product ===
                            name
                              ? styles.productChipActiveText
                              : styles.productChipText
                          }
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                <View
                  style={
                    styles.ingredientEditRow
                  }
                >
                  <TextInput
                    style={[
                      styles.input,
                      { flex: 1 },
                    ]}
                    value={String(
                      item.grams
                    )}
                    onChangeText={(v) =>
                      updateIngredient(
                        index,
                        "grams",
                        v
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="Граммы"
                  />

                  <TouchableOpacity
                    onPress={() =>
                      removeIngredient(
                        index
                      )
                    }
                    style={
                      styles.circleDelete
                    }
                  >
                    <Text>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}

          <Button
            title="＋ Добавить ингредиент"
            secondary
            onPress={addIngredient}
          />

          <Text
            style={styles.editorSection}
          >
            Приготовление
          </Text>

          {form.steps.map(
            (step, index) => (
              <View
                key={index}
                style={styles.stepEditor}
              >
                <View
                  style={
                    styles.stepNumber
                  }
                >
                  <Text
                    style={
                      styles.stepNumberText
                    }
                  >
                    {index + 1}
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.input,
                    { flex: 1 },
                  ]}
                  value={step}
                  onChangeText={(v) =>
                    updateStep(
                      index,
                      v
                    )
                  }
                  multiline
                  placeholder={`Шаг ${
                    index + 1
                  }`}
                />

                <TouchableOpacity
                  onPress={() =>
                    removeStep(
                      index
                    )
                  }
                  style={
                    styles.circleDelete
                  }
                >
                  <Text>×</Text>
                </TouchableOpacity>
              </View>
            )
          )}

          <Button
            title="＋ Добавить шаг"
            secondary
            onPress={addStep}
          />

          <View
            style={styles.previewMacros}
          >
            <Text
              style={styles.smallCaps}
            >
              КБЖУ НА ПОРЦИЮ
            </Text>

            <Text
              style={
                styles.previewCalories
              }
            >
              {
                preview.perServing
                  .kcal
              }{" "}
              ккал
            </Text>

            <Text>
              Б{" "}
              {
                preview.perServing
                  .protein
              }{" "}
              г · Ж{" "}
              {
                preview.perServing
                  .fat
              }{" "}
              г · У{" "}
              {
                preview.perServing
                  .carbs
              }{" "}
              г
            </Text>
          </View>

          <Button
            title="Сохранить рецепт"
            onPress={saveRecipe}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* =========================================================
     AUTHOR PRODUCTS
  ========================================================= */

  function AuthorProducts() {
    if (editingProduct) {
      return (
        <ProductEditor
          product={editingProduct}
          onClose={() =>
            setEditingProduct(null)
          }
        />
      );
    }

    return (
      <ScrollView
        contentContainerStyle={
          styles.authorContent
        }
      >
        <Button
          title="＋ Новый продукт"
          onPress={() =>
            setEditingProduct({
              name: "",
              kcal: 0,
              protein: 0,
              fat: 0,
              carbs: 0,
            })
          }
        />

        <Text
          style={
            styles.adminSectionTitle
          }
        >
          База продуктов
        </Text>

        {Object.entries(products).map(
          ([name, data]) => (
            <View
              key={name}
              style={
                styles.productAdminCard
              }
            >
              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={
                    styles.adminTitle
                  }
                >
                  {name}
                </Text>

                <Text
                  style={
                    styles.adminMeta
                  }
                >
                  {data.kcal} ккал · Б{" "}
                  {data.protein} · Ж{" "}
                  {data.fat} · У{" "}
                  {data.carbs}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.editSmall
                }
                onPress={() =>
                  setEditingProduct({
                    name,
                    ...data,
                  })
                }
              >
                <Text>✎</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.deleteSmall
                }
                onPress={() => {
                  Alert.alert(
                    "Удалить продукт?",
                    name,
                    [
                      {
                        text: "Отмена",
                        style:
                          "cancel",
                      },

                      {
                        text: "Удалить",
                        style:
                          "destructive",

                        onPress: () => {
                          setProducts(
                            (prev) => {
                              const copy =
                                {
                                  ...prev,
                                };

                              delete copy[
                                name
                              ];

                              return copy;
                            }
                          );

                          setRecipes(
                            (recipesPrev) =>
                              recipesPrev.map(
                                (recipe) => ({
                                  ...recipe,

                                  ingredients:
                                    recipe.ingredients.filter(
                                      (
                                        item
                                      ) =>
                                        item.product !==
                                        name
                                    ),
                                })
                              )
                          );
                        },
                      },
                    ]
                  );
                }}
              >
                <Text>×</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>
    );
  }

  /* =========================================================
     PRODUCT EDITOR
  ========================================================= */

  function ProductEditor({
    product,
    onClose,
  }) {
    const [form, setForm] =
      useState(product);

    const isNew = !product.name;

    function update(key, value) {
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    }

    function saveProduct() {
      const name =
        form.name.trim();

      if (!name) {
        Alert.alert(
          "Ошибка",
          "Введи название продукта."
        );

        return;
      }

      const data = {
        kcal: num(form.kcal),
        protein: num(
          form.protein
        ),
        fat: num(form.fat),
        carbs: num(
          form.carbs
        ),
      };

      const oldName =
        product.name;

      setProducts((prev) => {
        const copy = {
          ...prev,
        };

        if (
          !isNew &&
          oldName !== name
        ) {
          delete copy[oldName];
        }

        copy[name] = data;

        return copy;
      });

      /*
        Если название продукта изменилось,
        обновляем все рецепты.
      */

      if (
        !isNew &&
        oldName !== name
      ) {
        setRecipes(
          (recipesPrev) =>
            recipesPrev.map(
              (recipe) => ({
                ...recipe,

                ingredients:
                  recipe.ingredients.map(
                    (item) =>
                      item.product ===
                      oldName
                        ? {
                            ...item,
                            product:
                              name,
                          }
                        : item
                  ),
              })
            )
        );
      }

      setEditingProduct(null);

      Alert.alert(
        "Сохранено",
        "Продукт добавлен."
      );
    }

    return (
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={
            styles.editor
          }
        >
          <TouchableOpacity
            onPress={onClose}
          >
            <Text
              style={
                styles.closeEditor
              }
            >
              ‹ Назад
            </Text>
          </TouchableOpacity>

          <Text
            style={styles.editorTitle}
          >
            {isNew
              ? "Новый продукт"
              : "Изменить продукт"}
          </Text>

          <Text
            style={styles.label}
          >
            Название
          </Text>

          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) =>
              update("name", v)
            }
            placeholder="Например: Креветки"
          />

          <Text
            style={styles.label}
          >
            Значения на 100 г
          </Text>

          <TextInput
            style={styles.input}
            value={String(
              form.kcal
            )}
            onChangeText={(v) =>
              update(
                "kcal",
                v
              )
            }
            keyboardType="decimal-pad"
            placeholder="Ккал"
          />

          <TextInput
            style={styles.input}
            value={String(
              form.protein
            )}
            onChangeText={(v) =>
              update(
                "protein",
                v
              )
            }
            keyboardType="decimal-pad"
            placeholder="Белки"
          />

          <TextInput
            style={styles.input}
            value={String(
              form.fat
            )}
            onChangeText={(v) =>
              update(
                "fat",
                v
              )
            }
            keyboardType="decimal-pad"
            placeholder="Жиры"
          />

          <TextInput
            style={styles.input}
            value={String(
              form.carbs
            )}
            onChangeText={(v) =>
              update(
                "carbs",
                v
              )
            }
            keyboardType="decimal-pad"
            placeholder="Углеводы"
          />

          <View
            style={styles.previewMacros}
          >
            <Text
              style={styles.smallCaps}
            >
              НА 100 Г
            </Text>

            <Text>
              {num(form.kcal)} ккал ·
              Б{" "}
              {num(
                form.protein
              )}{" "}
              г · Ж{" "}
              {num(form.fat)} г ·
              У{" "}
              {num(
                form.carbs
              )}{" "}
              г
            </Text>
          </View>

          <Button
            title="Сохранить продукт"
            onPress={saveProduct}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* =========================================================
     BOTTOM NAV
  ========================================================= */

  function BottomNav() {
    return (
      <View
        style={styles.bottomNav}
      >
        <NavItem
          icon="⌂"
          title="Главная"
          active={
            screen === "home"
          }
          onPress={() =>
            setScreen("home")
          }
        />

        <NavItem
          icon="⌕"
          title="Калькулятор"
          active={
            screen === "calculator"
          }
          onPress={() =>
            setScreen(
              "calculator"
            )
          }
        />

        <NavItem
          icon="◷"
          title="Дневник"
          active={
            screen === "diary"
          }
          onPress={() =>
            setScreen("diary")
          }
        />

        <NavItem
          icon="♙"
          title="Профиль"
          active={
            screen === "profile"
          }
          onPress={() =>
            setScreen("profile")
          }
        />
      </View>
    );
  }

  function NavItem({
    icon,
    title,
    active,
    onPress,
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.navItem}
      >
        <Text
          style={[
            styles.navIcon,
            active &&
              styles.navActive,
          ]}
        >
          {icon}
        </Text>

        <Text
          style={[
            styles.navText,
            active &&
              styles.navActive,
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  /* =========================================================
     SCREEN ROUTER
  ========================================================= */

  if (!authChecked) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.loading}>
        <Text style={styles.logo}>PaCook</Text>
        <Text>Проверяем аккаунт...</Text>
      </View>
    </SafeAreaView>
  );
}

if (!authUser) {
  return (
    <AuthScreen
      onAuth={(user) => {
        setAuthUser(user);
      }}
    />
  );
}
  if (!loaded) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={styles.loading}
        >
          <Text
            style={styles.logo}
          >
            PaCook
          </Text>

          <Text>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "recipe") {
    return <RecipeScreen />;
  }

  if (screen === "calculator") {
    return <Calculator />;
  }

  if (screen === "diary") {
    return <Diary />;
  }

  if (screen === "profile") {
    return <Profile />;
  }

  if (screen === "authorPin") {
    return <AuthorPin />;
  }

  if (screen === "author") {
    return <Author />;
  }

  return <Home />;
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    padding: 20,
    paddingBottom: 110,
  },
  
logoutButton: {
  marginTop: 24,
  marginBottom: 30,
  padding: 16,
  borderRadius: 14,
  alignItems: "center",
  backgroundColor: "#F3F3F3",
},

logoutButtonText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#D64545",
},

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.green,
    letterSpacing: -1,
  },

  tagline: {
    color: COLORS.muted,
    marginTop: 2,
    fontSize: 12,
  },

  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      COLORS.card,
    alignItems: "center",
    justifyContent:
      "center",
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  hero: {
    backgroundColor:
      COLORS.green,
    borderRadius: 28,
    padding: 25,
    marginBottom: 20,
  },

  heroSmall: {
    color: "#C9D8CF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36,
  },

  heroText: {
    color: "#DDE8E1",
    marginTop: 14,
    lineHeight: 20,
  },

  search: {
    backgroundColor:
      COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 52,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    marginBottom: 14,
    color: COLORS.text,
  },

  category: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    backgroundColor:
      COLORS.card,
    borderRadius: 30,
    marginRight: 8,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  categoryActive: {
    backgroundColor:
      COLORS.green,
    borderColor:
      COLORS.green,
  },

  categoryText: {
    color: COLORS.muted,
    fontWeight: "600",
  },

  categoryTextActive: {
    color: COLORS.white,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
  },

  sectionCount: {
    color: COLORS.muted,
  },

  recipeCard: {
    backgroundColor:
      COLORS.card,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  recipeImage: {
    width: "100%",
    height: 190,
  },

  recipeInfo: {
    padding: 17,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  recipeCategory: {
    color: COLORS.green2,
    fontSize: 11,
    fontWeight: "800",
    textTransform:
      "uppercase",
  },

  recipeTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 7,
  },

  recipeDescription: {
    color: COLORS.muted,
    lineHeight: 19,
    marginTop: 6,
  },

  recipeBottom: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 14,
  },

  time: {
    color: COLORS.muted,
  },

  kcal: {
    color: COLORS.green,
    fontWeight: "800",
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    backgroundColor:
      COLORS.card,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
    flexDirection: "row",
    justifyContent:
      "space-around",
    paddingTop: 10,
  },

  navItem: {
    alignItems: "center",
    width: "25%",
  },

  navIcon: {
    fontSize: 22,
    color: COLORS.muted,
  },

  navText: {
    fontSize: 10,
    marginTop: 3,
    color: COLORS.muted,
  },

  navActive: {
    color: COLORS.green,
    fontWeight: "800",
  },

  detailImage: {
    width: "100%",
    height: 330,
  },

  backButton: {
    position: "absolute",
    top: 25,
    left: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      "rgba(255,255,255,0.9)",
    justifyContent:
      "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 34,
    color: COLORS.text,
    marginTop: -5,
  },

  detailContent: {
    padding: 20,
  },

  detailCategory: {
    color: COLORS.green2,
    fontWeight: "900",
    fontSize: 11,
    textTransform:
      "uppercase",
  },

  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      COLORS.card,
    justifyContent:
      "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  detailTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 10,
  },

  detailDescription: {
    color: COLORS.muted,
    lineHeight: 21,
    fontSize: 15,
    marginTop: 10,
  },

  macroRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },

  macroBox: {
    flex: 1,
    backgroundColor:
      COLORS.lightGreen,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },

  macroValue: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.green,
  },

  macroLabel: {
    fontSize: 8,
    color: COLORS.muted,
    fontWeight: "800",
    marginTop: 3,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  detailSectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    marginTop: 25,
    marginBottom: 12,
    color: COLORS.text,
  },

  ingredientRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  ingredientName: {
    color: COLORS.text,
    fontWeight: "600",
  },

  ingredientGrams: {
    color: COLORS.muted,
  },

  stepRow: {
    flexDirection: "row",
    alignItems:
      "flex-start",
    marginBottom: 15,
    gap: 12,
  },

  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor:
      COLORS.green,
    alignItems: "center",
    justifyContent:
      "center",
  },

  stepNumberText: {
    color: COLORS.white,
    fontWeight: "900",
  },

  stepText: {
    flex: 1,
    lineHeight: 20,
    color: COLORS.text,
    paddingTop: 4,
  },

  button: {
    backgroundColor:
      COLORS.green,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent:
      "center",
    paddingHorizontal: 18,
    marginTop: 15,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 15,
  },

  buttonSecondary: {
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  buttonSecondaryText: {
    color: COLORS.green,
  },

  buttonDanger: {
    borderColor:
      "#E8B8B6",
  },

  buttonDangerText: {
    color: COLORS.red,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.text,
  },

  pageSubtitle: {
    color: COLORS.muted,
    marginTop: 6,
    lineHeight: 20,
    marginBottom: 22,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 18,
    marginBottom: 8,
  },

  input: {
    minHeight: 50,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    color: COLORS.text,
    marginBottom: 9,
  },

  textArea: {
    minHeight: 90,
    paddingTop: 14,
  },

  productChip: {
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 7,
    marginBottom: 8,
  },

  productChipActive: {
    backgroundColor:
      COLORS.green,
    borderColor:
      COLORS.green,
  },

  productChipText: {
    color: COLORS.text,
    fontSize: 12,
  },

  productChipActiveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  calculatorCard: {
    backgroundColor:
      COLORS.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    marginTop: 20,
  },

  calculatorProduct: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
  },

  smallCaps: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.muted,
    letterSpacing: 1,
  },

  bigCalories: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.green,
    marginTop: 5,
  },

  empty: {
    alignItems: "center",
    paddingTop: 70,
  },

  emptyEmoji: {
    fontSize: 50,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "900",
    marginTop: 15,
  },

  emptyText: {
    color: COLORS.muted,
    marginTop: 5,
    textAlign: "center",
  },

  diaryItem: {
    backgroundColor:
      COLORS.card,
    borderRadius: 18,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  diaryImage: {
    width: 65,
    height: 65,
    borderRadius: 14,
  },

  diaryTitle: {
    fontWeight: "800",
    color: COLORS.text,
  },

  diaryKcal: {
    color: COLORS.green,
    marginTop: 4,
  },

  profileCard: {
    backgroundColor:
      COLORS.card,
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  largeProfileCircle: {
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor:
      COLORS.lightGreen,
    justifyContent:
      "center",
    alignItems: "center",
  },

  profileName: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12,
  },

  profileEmail: {
    color: COLORS.muted,
    marginTop: 4,
  },

  profileOption: {
    backgroundColor:
      COLORS.card,
    borderRadius: 18,
    padding: 17,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  optionIcon: {
    fontSize: 22,
  },

  optionTitle: {
    fontWeight: "900",
    color: COLORS.text,
    fontSize: 16,
  },

  optionText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  statsCard: {
    backgroundColor:
      COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  statRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    paddingTop: 15,
  },

  statValue: {
    fontWeight: "900",
    color: COLORS.green,
  },

  pinContainer: {
    flex: 1,
    padding: 25,
    justifyContent:
      "center",
  },

  pinIcon: {
    fontSize: 50,
    marginBottom: 15,
  },

  pinInput: {
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 18,
    height: 65,
    fontSize: 28,
    textAlign: "center",
    letterSpacing: 10,
    color: COLORS.text,
    marginTop: 15,
  },

  pinHint: {
    textAlign: "center",
    color: COLORS.muted,
    marginTop: 15,
  },

  authorHeader: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  authorTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
  },

  authorSubtitle: {
    color: COLORS.muted,
    marginTop: 3,
  },

  logout: {
    color: COLORS.red,
    fontWeight: "800",
  },

  authorTabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor:
      COLORS.card,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  authorTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 10,
  },

  authorTabActive: {
    backgroundColor:
      COLORS.green,
  },

  authorTabText: {
    color: COLORS.muted,
    fontWeight: "800",
  },

  authorTabTextActive: {
    color: COLORS.white,
  },

  authorContent: {
    padding: 20,
    paddingBottom: 50,
  },

  adminSectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    marginTop: 25,
    marginBottom: 12,
  },

  adminCard: {
    backgroundColor:
      COLORS.card,
    borderRadius: 18,
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  adminImage: {
    width: 90,
    height: 90,
    borderRadius: 13,
  },

  adminTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },

  adminMeta: {
    color: COLORS.muted,
    marginTop: 5,
    fontSize: 12,
  },

  adminActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },

  editButton: {
    backgroundColor:
      COLORS.lightGreen,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },

  editButtonText: {
    color: COLORS.green,
    fontWeight: "800",
    fontSize: 11,
  },

  deleteButton: {
    backgroundColor:
      "#F7E4E3",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },

  deleteButtonText: {
    color: COLORS.red,
    fontWeight: "800",
    fontSize: 11,
  },

  closeEditor: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 15,
  },

  editor: {
    padding: 20,
    paddingBottom: 60,
  },

  editorTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.text,
  },

  twoInputs: {
    flexDirection: "row",
    gap: 10,
  },

  editorSection: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 25,
    marginBottom: 10,
    color: COLORS.text,
  },

  ingredientEditor: {
    backgroundColor:
      COLORS.card,
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  ingredientEditRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  circleDelete: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      "#F7E4E3",
    alignItems: "center",
    justifyContent:
      "center",
  },

  stepEditor: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },

  previewMacros: {
    backgroundColor:
      COLORS.lightGreen,
    padding: 18,
    borderRadius: 18,
    marginTop: 20,
  },

  previewCalories: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.green,
    marginVertical: 4,
  },

  productAdminCard: {
    backgroundColor:
      COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  editSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      COLORS.lightGreen,
    alignItems: "center",
    justifyContent:
      "center",
  },

  deleteSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      "#F7E4E3",
    alignItems: "center",
    justifyContent:
      "center",
  },
});