import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

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
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

/* =========================================================
   PACOOK
   Recipes + Products + Author Mode + Local Storage + Supabase

   ВАЖНО:
   Этот файл рассчитан на работу прямо из Expo / React Native.

   Основные принципы:
   1. Supabase хранит общие данные.
   2. AsyncStorage хранит локальную копию.
   3. После перезапуска приложения локальные изменения
      не должны исчезать.
   4. Профиль пользователя сохраняется отдельно.
   5. Авторские рецепты и продукты сохраняются.
   6. Удалённые автором элементы не должны внезапно
      возвращаться после обновления приложения.
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

/*
   РАНЬШЕ ЗДЕСЬ БЫЛА КРИТИЧЕСКАЯ ОШИБКА:

   const SUPA = "...";

   а ниже использовалось:

   createClient(SUPABASE_URL, ...)

   Переменной SUPABASE_URL не существовало.

   Из-за этого JavaScript падал ещё до отображения приложения,
   что и давало белый экран.

   Теперь используется одна и та же переменная.
*/

const SUPABASE_URL =
  "https://fzjpsrcgmfihpnavnqdc.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_SfEpToq_GIgL37TYTNesIw_VAp6q5yt";


const PACOOK_URL =
  "https://pacook-l7lykxl6k-pa-cook.vercel.app";


/* =========================================================
   SUPABASE CLIENT
========================================================= */

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


/* =========================================================
   STORAGE KEYS
========================================================= */

const STORAGE_KEYS = {
  session: "PACOOK_SESSION",
  data: "PACOOK_DATA",
  profile: "PACOOK_PROFILE",
  settings: "PACOOK_SETTINGS",
};


/* =========================================================
   SAFE JSON
========================================================= */

function safeJsonParse(value, fallback = null) {
  try {
    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.log(
      "SAFE JSON PARSE ERROR:",
      error
    );

    return fallback;
  }
}


/* =========================================================
   NUMBER HELPER
========================================================= */

function num(value) {
  const parsed =
    Number.parseFloat(
      String(value ?? "")
        .replace(",", ".")
    );

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}


/* =========================================================
   STRING HELPER
========================================================= */

function cleanString(value) {
  return String(
    value ?? ""
  ).trim();
}


/* =========================================================
   ID HELPER
========================================================= */

function makeId(prefix = "item") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );
}


/* =========================================================
   REGISTRATION
========================================================= */

async function signInSupabase(
  email,
  password
) {
  const cleanEmail =
    cleanString(email)
      .toLowerCase();

  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  const session =
    data?.session;

  const user =
    data?.user;

  if (!session || !user) {
    throw new Error(
      "Не удалось создать сессию."
    );
  }

  /*
     Сохраняем полноценную сессию.

     Даже если Supabase уже хранит её через
     свой storage, собственная копия нужна PaCook
     для дополнительного восстановления.
  */

  await AsyncStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({
      access_token:
        session.access_token,

      refresh_token:
        session.refresh_token,

      expires_at:
        session.expires_at,

      expires_in:
        session.expires_in,

      token_type:
        session.token_type,

      user,
    })
  );

  return data;
}


/* =========================================================
   SIGN UP
========================================================= */

async function signUpSupabase(
  email,
  password
) {
  const cleanEmail =
    cleanString(email)
      .toLowerCase();

  const {
    data,
    error,
  } =
    await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo:
          PACOOK_URL,
      },
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (
    data?.session &&
    data?.user
  ) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({
        access_token:
          data.session
            .access_token,

        refresh_token:
          data.session
            .refresh_token,

        expires_at:
          data.session
            .expires_at,

        user: data.user,
      })
    );
  }

  return data;
}


/* =========================================================
   RESTORE SESSION
========================================================= */

async function restorePaCookSession() {
  try {
    /*
       Сначала просим сессию непосредственно
       у Supabase.
    */

    const {
      data,
      error,
    } =
      await supabase.auth.getSession();

    if (
      !error &&
      data?.session?.user
    ) {
      /*
         Обновляем нашу локальную копию.
      */

      await AsyncStorage.setItem(
        STORAGE_KEYS.session,
        JSON.stringify({
          access_token:
            data.session
              .access_token,

          refresh_token:
            data.session
              .refresh_token,

          expires_at:
            data.session
              .expires_at,

          expires_in:
            data.session
              .expires_in,

          token_type:
            data.session
              .token_type,

          user:
            data.session.user,
        })
      );

      return data.session.user;
    }

    /*
       Если Supabase пока не вернул сессию,
       пробуем старую локальную копию.
    */

    const local =
      await AsyncStorage.getItem(
        STORAGE_KEYS.session
      );

    const parsed =
      safeJsonParse(
        local,
        null
      );

    if (
      parsed?.user
    ) {
      return parsed.user;
    }

    return null;
  } catch (error) {
    console.log(
      "RESTORE SESSION ERROR:",
      error
    );

    /*
       Даже если восстановление с Supabase
       временно не получилось, приложение
       не должно превращаться в белый экран.
    */

    try {
      const local =
        await AsyncStorage.getItem(
          STORAGE_KEYS.session
        );

      const parsed =
        safeJsonParse(
          local,
          null
        );

      return (
        parsed?.user ||
        null
      );
    } catch {
      return null;
    }
  }
}


/* =========================================================
   AUTH SCREEN
========================================================= */

function AuthScreen({
  onAuth,
}) {
  const [
    mode,
    setMode,
  ] = useState(
    "login"
  );

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  const handleAuth =
    async () => {
      if (
        !email.trim() ||
        !password.trim()
      ) {
        setError(
          "Введите email и пароль"
        );

        return;
      }

      if (
        password.length < 6
      ) {
        setError(
          "Пароль должен содержать минимум 6 символов"
        );

        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          mode === "login"
            ? await signInSupabase(
                email,
                password
              )
            : await signUpSupabase(
                email,
                password
              );


        /* =================================================
           LOGIN
        ================================================= */

        if (
          mode === "login" &&
          data?.user
        ) {
          onAuth(
            data.user
          );

          return;
        }


        /* =================================================
           REGISTER
        ================================================= */

        if (
          mode === "register" &&
          data?.user
        ) {
          /*
             Если Supabase сразу выдал session,
             пользователь уже авторизован.
          */

          if (
            data?.session
          ) {
            onAuth(
              data.user
            );

            return;
          }

          /*
             Если включено подтверждение email,
             оставляем пользователя на экране входа.
          */

          setMode(
            "login"
          );

          setError(
            "Аккаунт создан. Проверьте почту и подтвердите email. После подтверждения вернитесь в PaCook и войдите."
          );

          return;
        }


        setError(
          "Не удалось выполнить операцию."
        );
      } catch (e) {
        console.log(
          "AUTH ERROR:",
          e
        );

        setError(
          e?.message ||
            "Ошибка. Проверьте email и пароль."
        );
      } finally {
        setLoading(
          false
        );
      }
    };


  return (
    <SafeAreaView
      style={{
        flex: 1,

        justifyContent:
          "center",

        padding: 24,

        backgroundColor:
          COLORS.bg,
      }}
    >
      <Text
        style={{
          fontSize: 38,

          fontWeight:
            "800",

          color:
            COLORS.green,

          textAlign:
            "center",
        }}
      >
        PaCook
      </Text>


      <Text
        style={{
          textAlign:
            "center",

          marginTop: 6,

          marginBottom:
            32,

          color:
            COLORS.muted,
        }}
      >
        Cook smart. Eat better.
      </Text>


      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"

        value={email}

        onChangeText={
          setEmail
        }

        autoCapitalize="none"

        autoCorrect={
          false
        }

        keyboardType={
          "email-address"
        }

        editable={
          !loading
        }

        style={{
          backgroundColor:
            COLORS.white,

          borderRadius:
            14,

          padding:
            16,

          marginBottom:
            12,

          fontSize:
            16,
        }}
      />


      <TextInput
        placeholder="Пароль"
        placeholderTextColor="#999"

        value={password}

        onChangeText={
          setPassword
        }

        secureTextEntry

        editable={
          !loading
        }

        style={{
          backgroundColor:
            COLORS.white,

          borderRadius:
            14,

          padding:
            16,

          marginBottom:
            12,

          fontSize:
            16,
        }}
      />


      {error ? (
        <Text
          style={{
            color:
              COLORS.red,

            marginBottom:
              12,

            lineHeight:
              20,
          }}
        >
          {error}
        </Text>
      ) : null}


      <TouchableOpacity
        onPress={
          handleAuth
        }

        disabled={
          loading
        }

        style={{
          backgroundColor:
            COLORS.green,

          padding:
            16,

          borderRadius:
            14,

          alignItems:
            "center",

          opacity:
            loading
              ? 0.6
              : 1,
        }}
      >
        <Text
          style={{
            color:
              COLORS.white,

            fontWeight:
              "700",

            fontSize:
              16,
          }}
        >
          {loading
            ? "Загрузка..."
            : mode ===
              "login"
            ? "Войти"
            : "Создать аккаунт"}
        </Text>
      </TouchableOpacity>


      <TouchableOpacity
        disabled={
          loading
        }

        onPress={() => {
          setMode(
            mode ===
              "login"
              ? "register"
              : "login"
          );

          setError("");
        }}
      >
        <Text
          style={{
            textAlign:
              "center",

            marginTop:
              20,

            color:
              COLORS.green,

            fontWeight:
              "600",
          }}
        >
          {mode ===
          "login"
            ? "Нет аккаунта? Создать"
            : "Уже есть аккаунт? Войти"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}


/* =========================================================
   SUPABASE PRODUCTS
========================================================= */

async function getSupabaseProducts() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products"
      )
      .select("*")
      .order(
        "name",
        {
          ascending:
            true,
        }
      );

  if (error) {
    console.log(
      "GET PRODUCTS ERROR:",
      error
    );

    throw error;
  }

  return (
    data || []
  );
}


/* =========================================================
   SUPABASE RECIPES
========================================================= */

async function getSupabaseRecipes() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "recipes"
      )
      .select("*")
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (error) {
    console.log(
      "GET RECIPES ERROR:",
      error
    );

    throw error;
  }

  return (
    data || []
  );
}


/* =========================================================
   SAVE PRODUCT
========================================================= */

async function saveSupabaseProduct(
  name,
  data,
  oldName = null
) {
  const cleanName =
    cleanString(
      name
    );

  if (!cleanName) {
    throw new Error(
      "Название продукта пустое."
    );
  }


  /*
     Если автор изменил название,
     удаляем старую запись.
  */

  if (
    oldName &&
    oldName !==
      cleanName
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          "products"
        )
        .delete()
        .eq(
          "name",
          oldName
        );

    if (error) {
      throw error;
    }
  }


  const {
    data: saved,
    error,
  } =
    await supabase
      .from(
        "products"
      )
      .upsert(
        {
          name:
            cleanName,

          kcal:
            num(
              data?.kcal
            ),

          protein:
            num(
              data?.protein
            ),

          fat:
            num(
              data?.fat
            ),

          carbs:
            num(
              data?.carbs
            ),

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "name",
        }
      )
      .select()
      .single();

  if (error) {
    console.log(
      "SAVE PRODUCT ERROR:",
      error
    );

    throw error;
  }

  return saved;
}


/* =========================================================
   DELETE PRODUCT
========================================================= */

async function deleteSupabaseProduct(
  name
) {
  const {
    error,
  } =
    await supabase
      .from(
        "products"
      )
      .delete()
      .eq(
        "name",
        name
      );

  if (error) {
    throw error;
  }
}


/* =========================================================
   SAVE RECIPE
========================================================= */

async function saveSupabaseRecipe(
  recipe
) {
  const payload = {
    id:
      String(
        recipe?.id ||
          makeId(
            "recipe"
          )
      ),

    title:
      cleanString(
        recipe?.title
      ),

    category:
      recipe?.category ||
      "Другое",

    time:
      num(
        recipe?.time
      ),

    servings:
      Math.max(
        1,
        num(
          recipe?.servings
        )
      ),

    image:
      recipe?.image ||
      "",

    description:
      recipe?.description ||
      "",

    ingredients:
      Array.isArray(
        recipe?.ingredients
      )
        ? recipe.ingredients
        : [],

    steps:
      Array.isArray(
        recipe?.steps
      )
        ? recipe.steps
        : [],

    pro:
      Boolean(
        recipe?.pro
      ),

    updated_at:
      new Date()
        .toISOString(),
  };


  if (
    !payload.title
  ) {
    throw new Error(
      "Название рецепта пустое."
    );
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "recipes"
      )
      .upsert(
        payload,
        {
          onConflict:
            "id",
        }
      )
      .select()
      .single();


  if (error) {
    console.log(
      "SAVE RECIPE ERROR:",
      error
    );

    throw error;
  }


  return data;
}


/* =========================================================
   DELETE RECIPE
========================================================= */

async function deleteSupabaseRecipe(
  id
) {
  const {
    error,
  } =
    await supabase
      .from(
        "recipes"
      )
      .delete()
      .eq(
        "id",
        String(id)
      );

  if (error) {
    throw error;
  }
}


/* =========================================================
   PROFILE
========================================================= */

/*
   Эти функции специально находятся вне React-компонента.

   Поэтому они НЕ должны обращаться напрямую
   к переменной authUser из компонента.

   User ID передаём аргументом.
*/


async function getProfile(
  userId
) {
  if (!userId) {
    return null;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select("*")
      .eq(
        "id",
        userId
      )
      .maybeSingle();


  if (error) {
    console.log(
      "GET PROFILE ERROR:",
      error
    );

    return null;
  }


  return data;
}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfileToSupabase(
  userId,
  {
    name,
    avatarUrl,
  }
) {
  if (!userId) {
    throw new Error(
      "Пользователь не авторизован."
    );
  }


  const payload = {
    id:
      userId,

    name:
      cleanString(
        name
      ) ||
      "PaCook User",

    avatar_url:
      avatarUrl ||
      "",

    updated_at:
      new Date()
        .toISOString(),
  };


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "profiles"
      )
      .upsert(
        payload,
        {
          onConflict:
            "id",
        }
      )
      .select()
      .single();


  if (error) {
    console.log(
      "SAVE PROFILE ERROR:",
      error
    );

    throw error;
  }


  return data;
}


/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  bg:
    "#F7F4EC",

  card:
    "#FFFDF8",

  green:
    "#345C48",

  green2:
    "#527966",

  lightGreen:
    "#E5EEE7",

  text:
    "#1D2922",

  muted:
    "#7A817C",

  border:
    "#E6E1D6",

  white:
    "#FFFFFF",

  red:
    "#B94A48",
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
   ADDITIONAL PRODUCTS
   Основная база продуктов для готовки
========================================================= */

const ADDITIONAL_PRODUCTS = {
  "Мука кукурузная": {
    kcal: 328,
    protein: 7.2,
    fat: 1.5,
    carbs: 72.1,
  },

  "Мука овсяная": {
    kcal: 369,
    protein: 13,
    fat: 6.5,
    carbs: 62,
  },

  "Мука миндальная": {
    kcal: 571,
    protein: 21,
    fat: 50,
    carbs: 22,
  },

  "Мука кокосовая": {
    kcal: 400,
    protein: 20,
    fat: 13,
    carbs: 60,
  },

  "Мука гречневая": {
    kcal: 335,
    protein: 13.6,
    fat: 3.1,
    carbs: 71.6,
  },

  "Крахмал картофельный": {
    kcal: 313,
    protein: 0.1,
    fat: 0,
    carbs: 78,
  },

  "Крахмал кукурузный": {
    kcal: 381,
    protein: 0.3,
    fat: 0.1,
    carbs: 91,
  },

  "Сахар": {
    kcal: 399,
    protein: 0,
    fat: 0,
    carbs: 99.8,
  },

  "Сахарная пудра": {
    kcal: 389,
    protein: 0,
    fat: 0,
    carbs: 99.8,
  },

  "Коричневый сахар": {
    kcal: 380,
    protein: 0,
    fat: 0,
    carbs: 98,
  },

  "Разрыхлитель теста": {
    kcal: 53,
    protein: 0,
    fat: 0,
    carbs: 27,
  },

  "Дрожжи": {
    kcal: 105,
    protein: 12.7,
    fat: 2.7,
    carbs: 8.5,
  },

  "Дрожжи сухие": {
    kcal: 325,
    protein: 40.4,
    fat: 7.6,
    carbs: 41.2,
  },

  "Соль": {
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  },

  "Корица молотая": {
    kcal: 247,
    protein: 4,
    fat: 1.2,
    carbs: 80.6,
  },

  "Ванилин": {
    kcal: 288,
    protein: 0.1,
    fat: 0.1,
    carbs: 12.7,
  },

  "Ваниль": {
    kcal: 288,
    protein: 0.1,
    fat: 0.1,
    carbs: 12.7,
  },

  "Сливочное масло": {
    kcal: 748,
    protein: 0.5,
    fat: 82.5,
    carbs: 0.8,
  },

  "Масло подсолнечное": {
    kcal: 899,
    protein: 0,
    fat: 99.9,
    carbs: 0,
  },

  "Кокосовое масло": {
    kcal: 899,
    protein: 0,
    fat: 99.9,
    carbs: 0,
  },

  "Сливки": {
    kcal: 300,
    protein: 2.5,
    fat: 30,
    carbs: 3,
  },

  "Сливки 10%": {
    kcal: 118,
    protein: 3,
    fat: 10,
    carbs: 4,
  },

  "Сливки 20%": {
    kcal: 206,
    protein: 2.8,
    fat: 20,
    carbs: 3.6,
  },

  "Сметана 15%": {
    kcal: 158,
    protein: 2.6,
    fat: 15,
    carbs: 3.6,
  },

  "Сметана 20%": {
    kcal: 206,
    protein: 2.5,
    fat: 20,
    carbs: 3.4,
  },

  "Сливочный сыр": {
    kcal: 342,
    protein: 5.5,
    fat: 34,
    carbs: 4,
  },

  "Моцарелла": {
    kcal: 280,
    protein: 22,
    fat: 22,
    carbs: 2.2,
  },

  "Пармезан": {
    kcal: 392,
    protein: 35.8,
    fat: 25.8,
    carbs: 3.2,
  },

  "Фета": {
    kcal: 264,
    protein: 14.2,
    fat: 21.3,
    carbs: 4.1,
  },

  "Творожный сыр": {
    kcal: 250,
    protein: 6,
    fat: 23,
    carbs: 5,
  },

  "Кефир": {
    kcal: 53,
    protein: 3,
    fat: 2.5,
    carbs: 4,
  },

  "Кефир 1%": {
    kcal: 40,
    protein: 3,
    fat: 1,
    carbs: 4,
  },

  "Ряженка": {
    kcal: 67,
    protein: 2.8,
    fat: 4,
    carbs: 4.2,
  },

  "Йогурт": {
    kcal: 60,
    protein: 4.3,
    fat: 3.2,
    carbs: 4.1,
  },

  "Натуральный йогурт": {
    kcal: 61,
    protein: 4.3,
    fat: 3.3,
    carbs: 4,
  },

  "Сгущённое молоко": {
    kcal: 321,
    protein: 7.2,
    fat: 8.5,
    carbs: 56,
  },

  "Кокосовое молоко": {
    kcal: 230,
    protein: 2.3,
    fat: 24,
    carbs: 3.3,
  },

  "Овсяное молоко": {
    kcal: 46,
    protein: 1,
    fat: 1.5,
    carbs: 6.7,
  },

  "Миндальное молоко": {
    kcal: 24,
    protein: 0.6,
    fat: 1.1,
    carbs: 3,
  },

  "Белый шоколад": {
    kcal: 539,
    protein: 5.9,
    fat: 32,
    carbs: 59,
  },

  "Молочный шоколад": {
    kcal: 535,
    protein: 7.2,
    fat: 30,
    carbs: 59,
  },

  "Тёмный шоколад": {
    kcal: 546,
    protein: 7.8,
    fat: 34,
    carbs: 48,
  },

  "Шоколадные капли": {
    kcal: 500,
    protein: 5,
    fat: 30,
    carbs: 55,
  },

  "Изюм": {
    kcal: 299,
    protein: 3.1,
    fat: 0.5,
    carbs: 79,
  },

  "Курага": {
    kcal: 241,
    protein: 3.4,
    fat: 0.5,
    carbs: 63,
  },

  "Чернослив": {
    kcal: 240,
    protein: 2.2,
    fat: 0.4,
    carbs: 64,
  },

  "Финики": {
    kcal: 282,
    protein: 2.5,
    fat: 0.4,
    carbs: 75,
  },

  "Кокосовая стружка": {
    kcal: 660,
    protein: 6.9,
    fat: 64.5,
    carbs: 23.7,
  },

  "Грецкий орех": {
    kcal: 654,
    protein: 15.2,
    fat: 65.2,
    carbs: 13.7,
  },

  "Миндаль": {
    kcal: 579,
    protein: 21.2,
    fat: 49.9,
    carbs: 21.6,
  },

  "Фундук": {
    kcal: 628,
    protein: 15,
    fat: 61,
    carbs: 17,
  },

  "Кешью": {
    kcal: 553,
    protein: 18.2,
    fat: 43.9,
    carbs: 30.2,
  },

  "Арахис": {
    kcal: 567,
    protein: 25.8,
    fat: 49.2,
    carbs: 16.1,
  },

  "Фисташки": {
    kcal: 562,
    protein: 20.2,
    fat: 45.3,
    carbs: 27.5,
  },

  "Семена чиа": {
    kcal: 486,
    protein: 16.5,
    fat: 30.7,
    carbs: 42.1,
  },

  "Семена льна": {
    kcal: 534,
    protein: 18.3,
    fat: 42.2,
    carbs: 28.9,
  },

  "Кунжут": {
    kcal: 573,
    protein: 17.7,
    fat: 49.7,
    carbs: 23.4,
  },

  "Тыквенные семечки": {
    kcal: 559,
    protein: 30.2,
    fat: 49.1,
    carbs: 10.7,
  },

  "Сухари панировочные": {
    kcal: 395,
    protein: 13.5,
    fat: 5.3,
    carbs: 74,
  },

  "Хлеб белый": {
    kcal: 265,
    protein: 9,
    fat: 3.2,
    carbs: 49,
  },

  "Хлеб чёрный": {
    kcal: 214,
    protein: 6.6,
    fat: 1.2,
    carbs: 41,
  },

  "Хлеб цельнозерновой": {
    kcal: 247,
    protein: 13,
    fat: 4.2,
    carbs: 41,
  },

  "Лаваш": {
    kcal: 277,
    protein: 9.1,
    fat: 1.2,
    carbs: 56,
  },

  "Тортилья пшеничная": {
    kcal: 312,
    protein: 8.3,
    fat: 8.3,
    carbs: 52,
  },

  "Макароны": {
    kcal: 350,
    protein: 11,
    fat: 1.3,
    carbs: 70,
  },

  "Спагетти": {
    kcal: 350,
    protein: 12,
    fat: 1.5,
    carbs: 71,
  },

  "Макароны цельнозерновые": {
    kcal: 348,
    protein: 13,
    fat: 2.5,
    carbs: 65,
  },

  "Булгур": {
    kcal: 342,
    protein: 12.3,
    fat: 1.3,
    carbs: 76,
  },

  "Кускус": {
    kcal: 376,
    protein: 12.8,
    fat: 0.6,
    carbs: 77.4,
  },

  "Киноа": {
    kcal: 368,
    protein: 14,
    fat: 6,
    carbs: 64,
  },

  "Перловка": {
    kcal: 324,
    protein: 9.3,
    fat: 1.1,
    carbs: 73.7,
  },

  "Пшено": {
    kcal: 342,
    protein: 11.5,
    fat: 3.3,
    carbs: 66.5,
  },

  "Чечевица": {
    kcal: 295,
    protein: 24,
    fat: 1.5,
    carbs: 46,
  },

  "Нут": {
    kcal: 364,
    protein: 19,
    fat: 6,
    carbs: 61,
  },

  "Фасоль": {
    kcal: 298,
    protein: 21,
    fat: 2,
    carbs: 47,
  },

  "Горох": {
    kcal: 298,
    protein: 20.5,
    fat: 2,
    carbs: 49,
  },

  "Зелёный горошек": {
    kcal: 73,
    protein: 5,
    fat: 0.2,
    carbs: 13.8,
  },

  "Кукуруза": {
    kcal: 86,
    protein: 3.2,
    fat: 1.2,
    carbs: 19,
  },

  "Помидор": {
    kcal: 18,
    protein: 0.9,
    fat: 0.2,
    carbs: 3.9,
  },

  "Огурец": {
    kcal: 15,
    protein: 0.7,
    fat: 0.1,
    carbs: 3.6,
  },

  "Морковь": {
    kcal: 35,
    protein: 1.3,
    fat: 0.1,
    carbs: 6.9,
  },

  "Лук": {
    kcal: 41,
    protein: 1.4,
    fat: 0.2,
    carbs: 10.4,
  },

  "Чеснок": {
    kcal: 149,
    protein: 6.4,
    fat: 0.5,
    carbs: 33,
  },

  "Болгарский перец": {
    kcal: 27,
    protein: 1.3,
    fat: 0.1,
    carbs: 5.3,
  },

  "Брокколи": {
    kcal: 34,
    protein: 2.8,
    fat: 0.4,
    carbs: 6.6,
  },

  "Цветная капуста": {
    kcal: 25,
    protein: 1.9,
    fat: 0.3,
    carbs: 5,
  },

  "Кабачок": {
    kcal: 24,
    protein: 0.6,
    fat: 0.3,
    carbs: 4.6,
  },

  "Баклажан": {
    kcal: 24,
    protein: 1,
    fat: 0.2,
    carbs: 5.5,
  },

  "Шпинат": {
    kcal: 23,
    protein: 2.9,
    fat: 0.4,
    carbs: 3.6,
  },

  "Салат": {
    kcal: 15,
    protein: 1.4,
    fat: 0.2,
    carbs: 2.9,
  },

  "Капуста": {
    kcal: 27,
    protein: 1.8,
    fat: 0.1,
    carbs: 6.8,
  },

  "Краснокочанная капуста": {
    kcal: 31,
    protein: 1.4,
    fat: 0.2,
    carbs: 7.4,
  },

  "Свёкла": {
    kcal: 43,
    protein: 1.6,
    fat: 0.2,
    carbs: 9.6,
  },

  "Тыква": {
    kcal: 26,
    protein: 1,
    fat: 0.1,
    carbs: 6.5,
  },

  "Грибы": {
    kcal: 27,
    protein: 3.5,
    fat: 0.5,
    carbs: 2.5,
  },

  "Шампиньоны": {
    kcal: 27,
    protein: 4.3,
    fat: 1,
    carbs: 0.1,
  },

  "Бекон": {
    kcal: 541,
    protein: 37,
    fat: 42,
    carbs: 1.4,
  },

  "Говядина": {
    kcal: 187,
    protein: 18.9,
    fat: 12.4,
    carbs: 0,
  },

  "Свинина": {
    kcal: 259,
    protein: 16,
    fat: 21.6,
    carbs: 0,
  },

  "Фарш говяжий": {
    kcal: 250,
    protein: 26,
    fat: 17,
    carbs: 0,
  },

  "Фарш куриный": {
    kcal: 143,
    protein: 17,
    fat: 8,
    carbs: 0,
  },

  "Фарш свиной": {
    kcal: 263,
    protein: 17.5,
    fat: 21,
    carbs: 0,
  },

  "Куриное бедро": {
    kcal: 177,
    protein: 18,
    fat: 11,
    carbs: 0,
  },

  "Куриное филе": {
    kcal: 110,
    protein: 23,
    fat: 1.9,
    carbs: 0,
  },

  "Куриные крылышки": {
    kcal: 203,
    protein: 18,
    fat: 14,
    carbs: 0,
  },

  "Куриная печень": {
    kcal: 136,
    protein: 20.4,
    fat: 5.9,
    carbs: 0.7,
  },

  "Говяжья печень": {
    kcal: 135,
    protein: 20.4,
    fat: 3.6,
    carbs: 3.9,
  },

  "Креветки": {
    kcal: 99,
    protein: 24,
    fat: 0.3,
    carbs: 0.2,
  },

  "Белая рыба": {
    kcal: 96,
    protein: 20,
    fat: 1.5,
    carbs: 0,
  },

  "Треска": {
    kcal: 82,
    protein: 17.7,
    fat: 0.7,
    carbs: 0,
  },

  "Креветка": {
    kcal: 99,
    protein: 24,
    fat: 0.3,
    carbs: 0.2,
  },

  "Сардины": {
    kcal: 208,
    protein: 24.6,
    fat: 11.5,
    carbs: 0,
  },

  "Красная икра": {
    kcal: 250,
    protein: 32,
    fat: 13,
    carbs: 0,
  },

  "Соевый соус": {
    kcal: 53,
    protein: 8,
    fat: 0.6,
    carbs: 4.9,
  },

  "Кетчуп": {
    kcal: 112,
    protein: 1.3,
    fat: 0.2,
    carbs: 27,
  },

  "Майонез": {
    kcal: 627,
    protein: 2.4,
    fat: 67,
    carbs: 3.9,
  },

  "Горчица": {
    kcal: 162,
    protein: 5.7,
    fat: 9.2,
    carbs: 12.7,
  },

  "Томатная паста": {
    kcal: 82,
    protein: 4.3,
    fat: 0.5,
    carbs: 18.9,
  },

  "Пассата томатная": {
    kcal: 29,
    protein: 1.5,
    fat: 0.2,
    carbs: 5,
  },

  "Лимон": {
    kcal: 29,
    protein: 1.1,
    fat: 0.3,
    carbs: 9,
  },

  "Апельсин": {
    kcal: 47,
    protein: 0.9,
    fat: 0.1,
    carbs: 11.8,
  },

  "Мандарин": {
    kcal: 53,
    protein: 0.8,
    fat: 0.3,
    carbs: 13.3,
  },

  "Груша": {
    kcal: 42,
    protein: 0.4,
    fat: 0.3,
    carbs: 10.9,
  },

  "Персик": {
    kcal: 39,
    protein: 0.9,
    fat: 0.3,
    carbs: 9.5,
  },

  "Виноград": {
    kcal: 69,
    protein: 0.7,
    fat: 0.2,
    carbs: 18,
  },

  "Киви": {
    kcal: 61,
    protein: 1.1,
    fat: 0.5,
    carbs: 14.7,
  },

  "Манго": {
    kcal: 60,
    protein: 0.8,
    fat: 0.4,
    carbs: 15,
  },

  "Ананас": {
    kcal: 50,
    protein: 0.5,
    fat: 0.1,
    carbs: 13,
  },

  "Вишня": {
    kcal: 52,
    protein: 1.1,
    fat: 0.2,
    carbs: 12,
  },

  "Перец": {
    kcal: 40,
    protein: 2,
    fat: 0.2,
    carbs: 9,
  },

  "Чёрный перец": {
    kcal: 251,
    protein: 10.4,
    fat: 3.3,
    carbs: 63.9,
  },

  "Паприка": {
    kcal: 282,
    protein: 14.1,
    fat: 12.9,
    carbs: 54,
  },

  "Итальянские травы": {
    kcal: 250,
    protein: 9,
    fat: 5,
    carbs: 50,
  },

  "Петрушка": {
    kcal: 36,
    protein: 3,
    fat: 0.8,
    carbs: 6.3,
  },

  "Укроп": {
    kcal: 43,
    protein: 3.5,
    fat: 1.1,
    carbs: 7,
  },

  "Базилик": {
    kcal: 23,
    protein: 3.2,
    fat: 0.6,
    carbs: 2.7,
  },

  "Авокадо": {
    kcal: 160,
    protein: 2,
    fat: 15,
    carbs: 9,
  },

  "Зелёный лук": {
    kcal: 32,
    protein: 1.8,
    fat: 0.2,
    carbs: 7.3,
  },

  "Имбирь": {
    kcal: 80,
    protein: 1.8,
    fat: 0.8,
    carbs: 18,
  },

  "Агар-агар": {
    kcal: 26,
    protein: 0.5,
    fat: 0.1,
    carbs: 0,
  },

  "Желатин": {
    kcal: 355,
    protein: 87.2,
    fat: 0.4,
    carbs: 0,
  },

  "Кленовый сироп": {
    kcal: 260,
    protein: 0,
    fat: 0,
    carbs: 67,
  },

  "Варенье": {
    kcal: 250,
    protein: 0.4,
    fat: 0.1,
    carbs: 65,
  },

  "Нутелла": {
    kcal: 539,
    protein: 6.3,
    fat: 30.9,
    carbs: 57.5,
  },
};


/* =========================================================
   MERGED INITIAL PRODUCTS
========================================================= */

const ALL_INITIAL_PRODUCTS = [
  ...Object.entries(INITIAL_PRODUCTS).map(
    ([name, data]) => ({
      id: `base-${name}`,
      name,
      ...data,
    })
  ),

  ...Object.entries(ADDITIONAL_PRODUCTS).map(
    ([name, data]) => ({
      id: `base-${name}`,
      name,
      ...data,
    })
  ),
];

/* =========================================================
   INITIAL RECIPES
========================================================= */

const INITIAL_RECIPES = [
  {
    id: "recipe_syrniki",
    title: "Кремовые сырники",
    category: "Завтрак",
    time: 25,
    servings: 2,
    image: "",
    description:
      "Нежные творожные сырники с золотистой корочкой.",
    ingredients: [
      {
        product: "Творог 5%",
        grams: 300,
      },
      {
        product: "Яйцо",
        grams: 50,
      },
      {
        product: "Рисовая мука",
        grams: 30,
      },
      {
        product: "Сахар",
        grams: 15,
      },
    ],
    steps: [
      "Смешайте творог, яйцо, муку и сахар.",
      "Сформируйте небольшие сырники.",
      "Обжарьте на среднем огне до золотистой корочки.",
      "Подавайте горячими.",
    ],
    pro: false,
  },

  {
    id: "recipe_oat_banana",
    title: "Овсяноблин с бананом",
    category: "Завтрак",
    time: 15,
    servings: 1,
    image: "",
    description:
      "Быстрый сладкий завтрак с овсянкой и бананом.",
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
      {
        product: "Греческий йогурт",
        grams: 50,
      },
    ],
    steps: [
      "Измельчите овсянку.",
      "Смешайте её с яйцом.",
      "Вылейте массу на разогретую сковороду.",
      "Обжарьте с двух сторон.",
      "Добавьте банан и йогурт.",
    ],
    pro: false,
  },

  {
    id: "recipe_fit_dessert",
    title: "Шоколадный фит-десерт",
    category: "Десерт",
    time: 10,
    servings: 2,
    image: "",
    description:
      "Нежный шоколадный десерт с творогом и какао.",
    ingredients: [
      {
        product: "Творог 5%",
        grams: 250,
      },
      {
        product: "Греческий йогурт",
        grams: 100,
      },
      {
        product: "Какао",
        grams: 15,
      },
      {
        product: "Мёд",
        grams: 20,
      },
      {
        product: "Банан",
        grams: 80,
      },
    ],
    steps: [
      "Положите все ингредиенты в блендер.",
      "Взбейте до однородной кремовой текстуры.",
      "Охладите перед подачей.",
    ],
    pro: false,
  },

  {
    id: "recipe_protein_oatmeal",
    title: "Протеиновая овсянка",
    category: "Завтрак",
    time: 10,
    servings: 1,
    image: "",
    description:
      "Сытная овсянка с бананом и творогом.",
    ingredients: [
      {
        product: "Овсянка",
        grams: 60,
      },
      {
        product: "Молоко 2.5%",
        grams: 150,
      },
      {
        product: "Банан",
        grams: 80,
      },
      {
        product: "Творог 5%",
        grams: 100,
      },
    ],
    steps: [
      "Залейте овсянку молоком.",
      "Варите до мягкости.",
      "Добавьте банан.",
      "Сверху выложите творог.",
    ],
    pro: false,
  },

  {
    id: "recipe_chicken_buckwheat",
    title: "Курица с гречкой",
    category: "Основные блюда",
    time: 35,
    servings: 2,
    image: "",
    description:
      "Простой домашний обед из курицы и гречки.",
    ingredients: [
      {
        product: "Куриная грудка",
        grams: 300,
      },
      {
        product: "Гречка",
        grams: 150,
      },
      {
        product: "Лук",
        grams: 70,
      },
      {
        product: "Морковь",
        grams: 70,
      },
      {
        product: "Оливковое масло",
        grams: 10,
      },
    ],
    steps: [
      "Отварите гречку.",
      "Нарежьте курицу небольшими кусочками.",
      "Обжарьте лук и морковь.",
      "Добавьте курицу.",
      "Соедините с готовой гречкой.",
    ],
    pro: false,
  },

  {
    id: "recipe_cottage_berry",
    title: "Творожный крем с ягодами",
    category: "Десерт",
    time: 10,
    servings: 2,
    image: "",
    description:
      "Лёгкий творожный крем со свежими ягодами.",
    ingredients: [
      {
        product: "Творог 5%",
        grams: 250,
      },
      {
        product: "Греческий йогурт",
        grams: 100,
      },
      {
        product: "Мёд",
        grams: 15,
      },
      {
        product: "Клубника",
        grams: 100,
      },
      {
        product: "Черника",
        grams: 50,
      },
    ],
    steps: [
      "Взбейте творог с йогуртом.",
      "Добавьте мёд.",
      "Выложите крем в стаканы.",
      "Добавьте ягоды.",
    ],
    pro: false,
  },

  {
    id: "recipe_cinnamon_rolls",
    title: "Синабоны с корицей и сахаром",
    category: "Выпечка",
    time: 120,
    servings: 10,
    image: "",
    description:
      "Мягкие домашние булочки с большим количеством корицы и сахарной начинкой.",
    ingredients: [
      {
        product: "Пшеничная мука",
        grams: 500,
      },
      {
        product: "Молоко 2.5%",
        grams: 250,
      },
      {
        product: "Яйцо",
        grams: 50,
      },
      {
        product: "Сливочное масло",
        grams: 70,
      },
      {
        product: "Сахар",
        grams: 100,
      },
      {
        product: "Дрожжи сухие",
        grams: 7,
      },
      {
        product: "Корица молотая",
        grams: 15,
      },
    ],
    steps: [
      "Подогрейте молоко.",
      "Добавьте дрожжи и немного сахара.",
      "Смешайте с яйцом, мукой и частью сливочного масла.",
      "Замесите мягкое тесто.",
      "Оставьте тесто подниматься примерно на 60 минут.",
      "Раскатайте тесто в большой пласт.",
      "Смажьте сливочным маслом.",
      "Посыпьте сахаром и корицей.",
      "Сверните плотный рулет.",
      "Нарежьте на отдельные булочки.",
      "Оставьте ещё на 20 минут.",
      "Выпекайте при 180°C около 20–25 минут.",
    ],
    pro: false,
  },

  {
    id: "recipe_carbonara",
    title: "Паста Карбонара",
    category: "Основные блюда",
    time: 25,
    servings: 2,
    image: "",
    description:
      "Классическая паста с беконом, яйцом и пармезаном.",
    ingredients: [
      {
        product: "Спагетти",
        grams: 200,
      },
      {
        product: "Бекон",
        grams: 100,
      },
      {
        product: "Яйцо",
        grams: 100,
      },
      {
        product: "Пармезан",
        grams: 50,
      },
      {
        product: "Чёрный перец",
        grams: 2,
      },
    ],
    steps: [
      "Отварите спагетти до состояния al dente.",
      "Обжарьте бекон.",
      "Смешайте яйца с тёртым пармезаном.",
      "Соедините горячую пасту с беконом.",
      "Снимите с огня и добавьте яично-сырную смесь.",
      "Перемешайте и сразу подавайте.",
    ],
    pro: false,
  },

  {
    id: "recipe_pizza",
    title: "Домашняя пицца",
    category: "Выпечка",
    time: 70,
    servings: 4,
    image: "",
    description:
      "Домашняя пицца с томатным соусом и моцареллой.",
    ingredients: [
      {
        product: "Пшеничная мука",
        grams: 300,
      },
      {
        product: "Дрожжи сухие",
        grams: 5,
      },
      {
        product: "Оливковое масло",
        grams: 15,
      },
      {
        product: "Томатная паста",
        grams: 80,
      },
      {
        product: "Моцарелла",
        grams: 150,
      },
      {
        product: "Помидор",
        grams: 100,
      },
    ],
    steps: [
      "Замесите тесто из муки, воды, дрожжей и масла.",
      "Оставьте тесто на 45 минут.",
      "Раскатайте основу.",
      "Смажьте томатным соусом.",
      "Добавьте моцареллу и помидоры.",
      "Выпекайте при 220°C около 12–15 минут.",
    ],
    pro: false,
  },

  {
    id: "recipe_plov",
    title: "Домашний плов",
    category: "Основные блюда",
    time: 90,
    servings: 5,
    image: "",
    description:
      "Ароматный домашний плов с мясом, рисом и морковью.",
    ingredients: [
      {
        product: "Рис",
        grams: 400,
      },
      {
        product: "Говядина",
        grams: 400,
      },
      {
        product: "Морковь",
        grams: 250,
      },
      {
        product: "Лук",
        grams: 150,
      },
      {
        product: "Масло подсолнечное",
        grams: 50,
      },
      {
        product: "Чеснок",
        grams: 20,
      },
    ],
    steps: [
      "Нарежьте мясо крупными кусочками.",
      "Обжарьте мясо в масле.",
      "Добавьте лук и морковь.",
      "Залейте водой и тушите.",
      "Добавьте промытый рис.",
      "Положите головку чеснока.",
      "Готовьте под крышкой до готовности риса.",
    ],
    pro: false,
  },

  {
    id: "recipe_borscht",
    title: "Домашний борщ",
    category: "Супы",
    time: 100,
    servings: 6,
    image: "",
    description:
      "Наваристый домашний борщ с овощами и говядиной.",
    ingredients: [
      {
        product: "Говядина",
        grams: 350,
      },
      {
        product: "Свёкла",
        grams: 250,
      },
      {
        product: "Капуста",
        grams: 300,
      },
      {
        product: "Картофель",
        grams: 300,
      },
      {
        product: "Морковь",
        grams: 120,
      },
      {
        product: "Лук",
        grams: 120,
      },
      {
        product: "Томатная паста",
        grams: 60,
      },
      {
        product: "Масло подсолнечное",
        grams: 20,
      },
    ],
    steps: [
      "Сварите бульон из говядины.",
      "Нарежьте картофель и капусту.",
      "Добавьте овощи в бульон.",
      "Отдельно обжарьте лук, морковь и свёклу.",
      "Добавьте томатную пасту.",
      "Переложите заправку в кастрюлю.",
      "Варите до полной готовности овощей.",
    ],
    pro: false,
  },

  {
    id: "recipe_potatoes",
    title: "Картофель по-деревенски",
    category: "Гарниры",
    time: 45,
    servings: 3,
    image: "",
    description:
      "Запечённый картофель с хрустящей корочкой и специями.",
    ingredients: [
      {
        product: "Картофель",
        grams: 600,
      },
      {
        product: "Оливковое масло",
        grams: 25,
      },
      {
        product: "Паприка",
        grams: 5,
      },
      {
        product: "Чёрный перец",
        grams: 2,
      },
      {
        product: "Соль",
        grams: 5,
      },
    ],
    steps: [
      "Нарежьте картофель крупными дольками.",
      "Смешайте с маслом и специями.",
      "Выложите на противень.",
      "Запекайте при 200°C около 35–40 минут.",
    ],
    pro: false,
  },

  {
    id: "recipe_omelette",
    title: "Пышный омлет",
    category: "Завтрак",
    time: 15,
    servings: 1,
    image: "",
    description:
      "Нежный классический омлет на завтрак.",
    ingredients: [
      {
        product: "Яйцо",
        grams: 150,
      },
      {
        product: "Молоко 2.5%",
        grams: 50,
      },
      {
        product: "Сливочное масло",
        grams: 5,
      },
      {
        product: "Соль",
        grams: 1,
      },
    ],
    steps: [
      "Взбейте яйца с молоком.",
      "Посолите.",
      "Разогрейте сковороду и добавьте масло.",
      "Вылейте яичную смесь.",
      "Готовьте на небольшом огне под крышкой.",
    ],
    pro: false,
  },

  {
    id: "recipe_cheesecake",
    title: "Классический чизкейк",
    category: "Десерт",
    time: 90,
    servings: 8,
    image: "",
    description:
      "Нежный запечённый чизкейк на сливочной основе.",
    ingredients: [
      {
        product: "Сливочный сыр",
        grams: 600,
      },
      {
        product: "Яйцо",
        grams: 150,
      },
      {
        product: "Сахар",
        grams: 120,
      },
      {
        product: "Сливки 20%",
        grams: 150,
      },
      {
        product: "Пшеничная мука",
        grams: 20,
      },
    ],
    steps: [
      "Размягчите сливочный сыр.",
      "Добавьте сахар и перемешайте.",
      "По одному добавьте яйца.",
      "Влейте сливки.",
      "Добавьте немного муки.",
      "Перелейте массу в форму.",
      "Выпекайте при 160°C около 55–65 минут.",
      "Полностью охладите перед подачей.",
    ],
    pro: false,
  },
];


/* =========================================================
   DATA NORMALIZATION
========================================================= */

function normalizeProduct(product) {
  if (!product) {
    return null;
  }

  /*
    Поддерживаем оба формата:

    Массив:
    {
      id,
      name,
      kcal,
      protein,
      fat,
      carbs
    }

    Объект:
    {
      "Творог 5%": {
        kcal,
        protein,
        fat,
        carbs
      }
    }

    Строка:
    "Творог 5%"
  */

  if (typeof product === "string") {
    return {
      id: makeId("product"),
      name: cleanString(product),
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    };
  }

  return {
    ...product,

    id:
      product.id ||
      makeId("product"),

    name:
      cleanString(product.name),

    kcal:
      num(product.kcal),

    protein:
      num(product.protein),

    fat:
      num(product.fat),

    carbs:
      num(product.carbs),
  };
}


/*
  ВСЕГДА возвращает МАССИВ.

  Это важно, потому что дальше приложение
  использует:

    products.filter(...)
    products.map(...)
    products.find(...)
    products.length
  */

function normalizeProducts(products) {
  const result = [];

  if (Array.isArray(products)) {
    products.forEach((product) => {
      const normalized =
        normalizeProduct(product);

      if (normalized?.name) {
        result.push(normalized);
      }
    });

    return result;
  }


  /*
    Если старые данные были сохранены
    в формате объекта:

    {
      "Творог 5%": {
        kcal: 121,
        protein: 17,
        fat: 5,
        carbs: 2
      }
    }

    превращаем их обратно в массив.
  */

  if (
    products &&
    typeof products === "object"
  ) {
    Object.entries(products).forEach(
      ([name, value]) => {
        const normalized =
          normalizeProduct({
            ...(value || {}),
            name,
          });

        if (normalized?.name) {
          result.push(normalized);
        }
      }
    );
  }

  return result;
}


/*
  Дополнительная защита.

  Если где-то в старых сохранённых данных
  products оказался объектом, эта функция
  гарантирует, что приложение получит массив.
*/

function ensureProductsArray(products) {
  if (Array.isArray(products)) {
    return products;
  }

  const normalized =
    normalizeProducts(products);

  if (Array.isArray(normalized)) {
    return normalized;
  }

  return [];
}


/* =========================================================
   RECIPE NORMALIZATION
========================================================= */

function normalizeRecipe(
  recipe
) {
  if (!recipe) {
    return null;
  }

  return {
    ...recipe,

    id:
      String(
        recipe.id ||
          makeId(
            "recipe"
          )
      ),

    title:
      cleanString(
        recipe.title
      ),

    category:
      cleanString(
        recipe.category
      ) ||
      "Другое",

    time:
      num(
        recipe.time
      ),

    servings:
      Math.max(
        1,
        num(
          recipe.servings
        ) || 1
      ),

    image:
      recipe.image ||
      "",

    description:
      recipe.description ||
      "",

    ingredients:
      Array.isArray(
        recipe.ingredients
      )
        ? recipe.ingredients.map(
            (ingredient) => ({
              product:
                cleanString(
                  ingredient?.product
                ),

              grams:
                num(
                  ingredient?.grams
                ),
            })
          )
        : [],

    steps:
      Array.isArray(
        recipe.steps
      )
        ? recipe.steps.map(
            (step) =>
              String(
                step
              )
          )
        : [],

    pro:
      Boolean(
        recipe.pro
      ),
  };
}


function normalizeRecipes(
  recipes
) {
  if (
    !Array.isArray(
      recipes
    )
  ) {
    return [];
  }

  return recipes
    .map(
      normalizeRecipe
    )
    .filter(
      Boolean
    );
}



/* =========================================================
   LOCAL DATA LOADING
========================================================= */

async function loadLocalPaCookData() {
  const defaultData = {
    products: ALL_INITIAL_PRODUCTS,
    recipes: INITIAL_RECIPES,
    favorites: [],
    diary: [],
    deletedProducts: [],
    deletedRecipes: [],
  };

  try {
    const raw =
      await AsyncStorage.getItem(
        STORAGE_KEYS.data
      );

    if (!raw) {
      return defaultData;
    }

    const parsed =
      safeJsonParse(
        raw,
        null
      );

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return defaultData;
    }

    /*
      PRODUCTS

      Старые версии PaCook могли хранить
      продукты как объект.

      Новая версия приложения всегда
      работает с products как с массивом.
    */

    let loadedProducts;

    if (
      parsed.products !== undefined &&
      parsed.products !== null
    ) {
      loadedProducts =
        ensureProductsArray(
          parsed.products
        );
    } else {
      loadedProducts =
        [...ALL_INITIAL_PRODUCTS];
    }

    /*
      Если после нормализации почему-то
      получился пустой результат, но в
      сохранённых данных действительно были
      продукты, используем базовую базу.
    */

    if (
      !Array.isArray(
        loadedProducts
      )
    ) {
      loadedProducts =
        [...ALL_INITIAL_PRODUCTS];
    }


    /*
      RECIPES
    */

    let loadedRecipes;

    if (
      Array.isArray(
        parsed.recipes
      )
    ) {
      loadedRecipes =
        normalizeRecipes(
          parsed.recipes
        );
    } else {
      loadedRecipes =
        [...INITIAL_RECIPES];
    }


    /*
      FAVORITES
    */

    const loadedFavorites =
      Array.isArray(
        parsed.favorites
      )
        ? parsed.favorites
        : [];


    /*
      DIARY
    */

    const loadedDiary =
      Array.isArray(
        parsed.diary
      )
        ? parsed.diary
        : [];


    /*
      DELETED PRODUCTS
    */

    const loadedDeletedProducts =
      Array.isArray(
        parsed.deletedProducts
      )
        ? parsed.deletedProducts
        : [];


    /*
      DELETED RECIPES
    */

    const loadedDeletedRecipes =
      Array.isArray(
        parsed.deletedRecipes
      )
        ? parsed.deletedRecipes
        : [];


    /*
      ВСЕГДА возвращаем правильную
      структуру данных.
    */

    return {
      products:
        Array.isArray(
          loadedProducts
        )
          ? loadedProducts
          : [
              ...ALL_INITIAL_PRODUCTS,
            ],

      recipes:
        Array.isArray(
          loadedRecipes
        )
          ? loadedRecipes
          : [
              ...INITIAL_RECIPES,
            ],

      favorites:
        loadedFavorites,

      diary:
        loadedDiary,

      deletedProducts:
        loadedDeletedProducts,

      deletedRecipes:
        loadedDeletedRecipes,
    };

  } catch (error) {
    console.log(
      "LOAD LOCAL DATA ERROR:",
      error
    );

    return defaultData;
  }
}

/* =========================================================
   LOCAL DATA SAVE
========================================================= */

async function saveLocalPaCookData(data) {
  try {
    /*
      PRODUCTS всегда сохраняем как МАССИВ.
      Это важно, потому что всё приложение
      работает с products через:
      .filter()
      .map()
      .find()
      .length
    */

    const products =
      ensureProductsArray(
        data?.products
      );

    const recipes =
      Array.isArray(
        data?.recipes
      )
        ? normalizeRecipes(
            data.recipes
          )
        : [];


    const favorites =
      Array.isArray(
        data?.favorites
      )
        ? data.favorites
        : [];


    const diary =
      Array.isArray(
        data?.diary
      )
        ? data.diary
        : [];


    const deletedProducts =
      Array.isArray(
        data?.deletedProducts
      )
        ? data.deletedProducts
        : [];


    const deletedRecipes =
      Array.isArray(
        data?.deletedRecipes
      )
        ? data.deletedRecipes
        : [];


    await AsyncStorage.setItem(
      STORAGE_KEYS.data,
      JSON.stringify({
        products:
          Array.isArray(products)
            ? products
            : [
                ...ALL_INITIAL_PRODUCTS,
              ],

        recipes:
          recipes,

        favorites:
          favorites,

        diary:
          diary,

        deletedProducts:
          deletedProducts,

        deletedRecipes:
          deletedRecipes,
      })
    );

    return true;

  } catch (error) {
    console.log(
      "SAVE LOCAL DATA ERROR:",
      error
    );

    return false;
  }
}

/* =========================================================
   DATA MERGE HELPERS
========================================================= */

/*
   Локальные авторские изменения имеют приоритет
   над встроенными стартовыми данными.

   PRODUCTS всегда возвращается как МАССИВ.

   Это важно, потому что приложение использует:

   products.filter(...)
   products.map(...)
   products.find(...)
   products.length
*/


function mergeProducts(
  baseProducts,
  localProducts,
  deletedProducts = []
) {
  const base =
    ensureProductsArray(
      baseProducts
    );

  const local =
    ensureProductsArray(
      localProducts
    );

  /*
    Объединяем продукты по имени.

    Если локальный продукт существует,
    он заменяет базовый.
  */

  const productMap =
    new Map();

  base.forEach(
    (product) => {
      const normalized =
        normalizeProduct(
          product
        );

      if (
        normalized?.name
      ) {
        productMap.set(
          normalized.name,
          normalized
        );
      }
    }
  );


  local.forEach(
    (product) => {
      const normalized =
        normalizeProduct(
          product
        );

      if (
        normalized?.name
      ) {
        productMap.set(
          normalized.name,
          normalized
        );
      }
    }
  );


  /*
    Удалённые продукты
    не должны появляться снова.
  */

  const deletedSet =
    new Set(
      Array.isArray(
        deletedProducts
      )
        ? deletedProducts.map(
            (name) =>
              cleanString(
                name
              )
          )
        : []
    );


  const result = [];

  productMap.forEach(
    (product, name) => {
      if (
        name &&
        !deletedSet.has(
          name
        )
      ) {
        result.push(
          product
        );
      }
    }
  );


  return result;
}


/*
   MERGE RECIPES

   Локальные рецепты имеют приоритет
   над встроенными рецептами.

   Всегда возвращаем МАССИВ.
*/

function mergeRecipes(
  baseRecipes,
  localRecipes,
  deletedRecipes = []
) {
  const result =
    normalizeRecipes(
      Array.isArray(
        baseRecipes
      )
        ? baseRecipes
        : []
    ).map(
      (recipe) => ({
        ...recipe,
      })
    );


  const local =
    normalizeRecipes(
      Array.isArray(
        localRecipes
      )
        ? localRecipes
        : []
    );


  const indexById =
    new Map();


  result.forEach(
    (
      recipe,
      index
    ) => {
      indexById.set(
        String(
          recipe.id
        ),
        index
      );
    }
  );


  /*
    Локальный рецепт заменяет
    базовый рецепт с таким же id.
  */

  local.forEach(
    (recipe) => {
      const id =
        String(
          recipe.id
        );

      if (
        indexById.has(
          id
        )
      ) {
        const index =
          indexById.get(
            id
          );

        result[index] =
          recipe;
      } else {
        indexById.set(
          id,
          result.length
        );

        result.push(
          recipe
        );
      }
    }
  );


  /*
    Удалённые рецепты
    не должны появляться снова.
  */

  const deletedSet =
    new Set(
      Array.isArray(
        deletedRecipes
      )
        ? deletedRecipes.map(
            (id) =>
              String(id)
          )
        : []
    );


  return result.filter(
    (recipe) =>
      !deletedSet.has(
        String(
          recipe.id
        )
      )
  );
}

/* =========================================================
   PRODUCT CALCULATION
========================================================= */

function calculateProductNutrition(
  product,
  grams
) {
  const weight =
    num(
      grams
    );

  const item =
    product || {};


  const multiplier =
    weight / 100;


  return {
    kcal:
      num(
        item.kcal
      ) *
      multiplier,

    protein:
      num(
        item.protein
      ) *
      multiplier,

    fat:
      num(
        item.fat
      ) *
      multiplier,

    carbs:
      num(
        item.carbs
      ) *
      multiplier,
  };
}

/* =========================================================
   RECIPE NUTRITION
========================================================= */

function calculateRecipeNutrition(
  recipe,
  products
) {
  const normalized =
    normalizeRecipe(
      recipe
    );

  if (!normalized) {
    return {
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      totalWeight: 0,

      perServing: {
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      },
    };
  }

  const productsArray =
    ensureProductsArray(
      products
    );

  let kcal = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;
  let totalWeight = 0;

  normalized.ingredients.forEach(
    (ingredient) => {
      const productName =
        cleanString(
          ingredient.product
        );

      if (!productName) {
        return;
      }

      /*
        Ищем продукт по названию.
        products теперь всегда может быть массивом.
      */

      const product =
        productsArray.find(
          (item) =>
            cleanString(
              item?.name
            ) === productName
        ) || null;

      if (!product) {
        return;
      }

      const grams =
        num(
          ingredient.grams
        );

      if (grams <= 0) {
        return;
      }

      const nutrition =
        calculateProductNutrition(
          product,
          grams
        );

      kcal +=
        nutrition.kcal;

      protein +=
        nutrition.protein;

      fat +=
        nutrition.fat;

      carbs +=
        nutrition.carbs;

      totalWeight +=
        grams;
    }
  );

  const servings =
    Math.max(
      1,
      num(
        normalized.servings
      ) || 1
    );

  return {
    kcal,
    protein,
    fat,
    carbs,
    totalWeight,

    perServing: {
      kcal:
        kcal /
        servings,

      protein:
        protein /
        servings,

      fat:
        fat /
        servings,

      carbs:
        carbs /
        servings,
    },
  };
}

/* =========================================================
   ROUND NUTRITION
========================================================= */

function roundNutrition(
  value
) {
  return Math.round(
    num(value)
  );
}


function formatNutrition(
  value
) {
  return Math.round(
    num(value)
  ).toString();
}


/* =========================================================
   PROFILE LOCAL DATA
========================================================= */

async function loadLocalProfile() {
  try {
    const raw =
      await AsyncStorage.getItem(
        STORAGE_KEYS.profile
      );


    const profile =
      safeJsonParse(
        raw,
        null
      );


    if (
      !profile ||
      typeof profile !==
        "object"
    ) {
      return {
        name:
          "PaCook User",

        avatarUrl:
          "",

        bio:
          "",

        city:
          "",

        age:
          "",

        goal:
          "",
      };
    }


    return {
      name:
        cleanString(
          profile.name
        ) ||
        "PaCook User",

      avatarUrl:
        cleanString(
          profile.avatarUrl
        ),

      bio:
        cleanString(
          profile.bio
        ),

      city:
        cleanString(
          profile.city
        ),

      age:
        cleanString(
          profile.age
        ),

      goal:
        cleanString(
          profile.goal
        ),
    };
  } catch (error) {
    console.log(
      "LOAD PROFILE ERROR:",
      error
    );


    return {
      name:
        "PaCook User",

      avatarUrl:
        "",

      bio:
        "",

      city:
        "",

      age:
        "",

      goal:
        "",
    };
  }
}


/* =========================================================
   SAVE LOCAL PROFILE
========================================================= */

async function saveLocalProfile(
  profile
) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify({
        name:
          cleanString(
            profile?.name
          ) ||
          "PaCook User",

        avatarUrl:
          cleanString(
            profile?.avatarUrl
          ),

        bio:
          cleanString(
            profile?.bio
          ),

        city:
          cleanString(
            profile?.city
          ),

        age:
          cleanString(
            profile?.age
          ),

        goal:
          cleanString(
            profile?.goal
          ),
      })
    );


    return true;
  } catch (error) {
    console.log(
      "SAVE PROFILE ERROR:",
      error
    );

    return false;
  }
}


/* =========================================================
   SETTINGS
========================================================= */

const DEFAULT_SETTINGS = {
  notifications:
    true,

  darkMode:
    false,

  haptics:
    true,

  showCalories:
    true,

  showMacros:
    true,
};


async function loadSettings() {
  try {
    const raw =
      await AsyncStorage.getItem(
        STORAGE_KEYS.settings
      );


    const parsed =
      safeJsonParse(
        raw,
        null
      );


    return {
      ...DEFAULT_SETTINGS,
      ...(parsed || {}),
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
    };
  }
}


async function saveSettings(
  settings
) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        ...(settings || {}),
      })
    );

    return true;
  } catch (error) {
    console.log(
      "SAVE SETTINGS ERROR:",
      error
    );

    return false;
  }
}


/* =========================================================
   IMAGE URL HELPER
========================================================= */

function normalizeImageUrl(
  value
) {
  const url =
    cleanString(
      value
    );


  if (!url) {
    return "";
  }


  /*
     Разрешаем обычные URL:
     https://...
     http://...
     data:image/...
  */

  if (
    url.startsWith(
      "https://"
    ) ||
    url.startsWith(
      "http://"
    ) ||
    url.startsWith(
      "data:image/"
    )
  ) {
    return url;
  }


  return "";
}


/* =========================================================
   IMAGE ERROR SAFE HANDLER
========================================================= */

function ImageWithFallback({
  uri,
  style,
  fallback,
}) {
  const [
    failed,
    setFailed,
  ] = useState(false);


  const imageUri =
    normalizeImageUrl(
      uri
    );


  if (
    !imageUri ||
    failed
  ) {
    return (
      <View
        style={[
          style,
          {
            alignItems:
              "center",

            justifyContent:
              "center",

            backgroundColor:
              COLORS.lightGreen,
          },
        ]}
      >
        <Text
          style={{
            fontSize:
              34,
          }}
        >
          {fallback ||
            "🍽️"}
        </Text>
      </View>
    );
  }


  return (
    <Image
      source={{
        uri:
          imageUri,
      }}

      style={
        style
      }

      resizeMode="cover"

      onError={() =>
        setFailed(
          true
        )
      }
    />
  );
}


/* =========================================================
   ERROR BOUNDARY STYLE HANDLER
========================================================= */

function installGlobalErrorHandler() {
  if (
    typeof window ===
      "undefined"
  ) {
    return;
  }


  if (
    window.__PACOOK_ERROR_HANDLER_INSTALLED
  ) {
    return;
  }


  window.__PACOOK_ERROR_HANDLER_INSTALLED =
    true;


  const previousOnError =
    window.onerror;


  window.onerror = function (
    message,
    source,
    lineno,
    colno,
    error
  ) {
    console.log(
      "PaCook ERROR:",
      message,
      source,
      lineno,
      colno,
      error
    );


    try {
      if (
        typeof window.alert ===
        "function"
      ) {
        window.alert(
          "PaCook ERROR:\n" +
            String(
              message
            )
        );
      }
    } catch {}


    if (
      typeof previousOnError ===
      "function"
    ) {
      return previousOnError(
        message,
        source,
        lineno,
        colno,
        error
      );
    }


    return false;
  };
}


/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function SectionTitle({
  title,
  subtitle,
}) {
  return (
    <View
      style={{
        marginBottom:
          14,
      }}
    >
      <Text
        style={{
          fontSize:
            22,

          fontWeight:
            "800",

          color:
            COLORS.text,
        }}
      >
        {title}
      </Text>


      {subtitle ? (
        <Text
          style={{
            marginTop:
              4,

            color:
              COLORS.muted,

            fontSize:
              14,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}


/* =========================================================
   PILL
========================================================= */

function Pill({
  children,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      onPress={
        onPress
      }

      disabled={
        !onPress
      }

      style={{
        paddingHorizontal:
          14,

        paddingVertical:
          8,

        borderRadius:
          999,

        backgroundColor:
          active
            ? COLORS.green
            : COLORS.card,

        borderWidth:
          active
            ? 0
            : 1,

        borderColor:
          COLORS.border,

        marginRight:
          8,

        marginBottom:
          8,
      }}
    >
      <Text
        style={{
          color:
            active
              ? COLORS.white
              : COLORS.text,

          fontWeight:
            "600",

          fontSize:
            13,
        }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   PRIMARY BUTTON
========================================================= */

function PrimaryButton({
  title,
  onPress,
  disabled,
  icon,
}) {
  return (
    <TouchableOpacity
      onPress={
        onPress
      }

      disabled={
        disabled
      }

      activeOpacity={
        0.8
      }

      style={{
        backgroundColor:
          COLORS.green,

        borderRadius:
          14,

        paddingVertical:
          14,

        paddingHorizontal:
          18,

        alignItems:
          "center",

        justifyContent:
          "center",

        opacity:
          disabled
            ? 0.5
            : 1,

        flexDirection:
          "row",

        gap: 8,
      }}
    >
      {icon ? (
        <Text
          style={{
            color:
              COLORS.white,

            fontSize:
              17,
          }}
        >
          {icon}
        </Text>
      ) : null}


      <Text
        style={{
          color:
            COLORS.white,

          fontSize:
            15,

          fontWeight:
            "800",
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   SECONDARY BUTTON
========================================================= */

function SecondaryButton({
  title,
  onPress,
  disabled,
}) {
  return (
    <TouchableOpacity
      onPress={
        onPress
      }

      disabled={
        disabled
      }

      activeOpacity={
        0.8
      }

      style={{
        backgroundColor:
          COLORS.card,

        borderRadius:
          14,

        borderWidth:
          1,

        borderColor:
          COLORS.border,

        paddingVertical:
          13,

        paddingHorizontal:
          18,

        alignItems:
          "center",

        justifyContent:
          "center",

        opacity:
          disabled
            ? 0.5
            : 1,
      }}
    >
      <Text
        style={{
          color:
            COLORS.green,

          fontSize:
            15,

          fontWeight:
            "800",
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon = "🍽️",
  title,
  text,
  actionTitle,
  onAction,
}) {
  return (
    <View
      style={{
        backgroundColor:
          COLORS.card,

        borderRadius:
          20,

        padding:
          28,

        alignItems:
          "center",

        borderWidth:
          1,

        borderColor:
          COLORS.border,
      }}
    >
      <Text
        style={{
          fontSize:
            42,

          marginBottom:
            10,
        }}
      >
        {icon}
      </Text>


      <Text
        style={{
          color:
            COLORS.text,

          fontSize:
            18,

          fontWeight:
            "800",

          textAlign:
            "center",
        }}
      >
        {title}
      </Text>


      {text ? (
        <Text
          style={{
            color:
              COLORS.muted,

            marginTop:
              7,

            lineHeight:
              20,

            textAlign:
              "center",
          }}
        >
          {text}
        </Text>
      ) : null}


      {actionTitle &&
      onAction ? (
        <View
          style={{
            width:
              "100%",

            marginTop:
              18,
          }}
        >
          <PrimaryButton
            title={
              actionTitle
            }
            onPress={
              onAction
            }
          />
        </View>
      ) : null}
    </View>
  );
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  suffix,
}) {
  return (
    <View
      style={{
        flex: 1,

        backgroundColor:
          COLORS.card,

        borderRadius:
          16,

        padding:
          14,

        borderWidth:
          1,

        borderColor:
          COLORS.border,

        minWidth:
          90,
      }}
    >
      <Text
        style={{
          color:
            COLORS.muted,

          fontSize:
            12,

          marginBottom:
            5,
        }}
      >
        {label}
      </Text>


      <Text
        style={{
          color:
            COLORS.text,

          fontSize:
            20,

          fontWeight:
            "800",
        }}
      >
        {value}
        {suffix
          ? ` ${suffix}`
          : ""}
      </Text>
    </View>
  );
}


/* =========================================================
   MACRO ROW
========================================================= */

function MacroRow({
  kcal,
  protein,
  fat,
  carbs,
}) {
  return (
    <View
      style={{
        flexDirection:
          "row",

        gap: 8,

        marginTop:
          12,
      }}
    >
      <StatCard
        label="Ккал"
        value={
          roundNutrition(
            kcal
          )
        }
      />

      <StatCard
        label="Белки"
        value={
          roundNutrition(
            protein
          )
        }
        suffix="г"
      />

      <StatCard
        label="Жиры"
        value={
          roundNutrition(
            fat
          )
        }
        suffix="г"
      />

      <StatCard
        label="Углеводы"
        value={
          roundNutrition(
            carbs
          )
        }
        suffix="г"
      />
    </View>
  );
}


/* =========================================================
   RECIPE CARD
========================================================= */

function RecipeCard({
  recipe,
  products,
  onPress,
  favorite,
  onFavorite,
}) {
  const nutrition =
    useMemo(
      () =>
        calculateRecipeNutrition(
          recipe,
          products
        ),
      [
        recipe,
        products,
      ]
    );


  return (
    <TouchableOpacity
      activeOpacity={
        0.9
      }

      onPress={
        onPress
      }

      style={{
        backgroundColor:
          COLORS.card,

        borderRadius:
          20,

        overflow:
          "hidden",

        borderWidth:
          1,

        borderColor:
          COLORS.border,

        marginBottom:
          14,
      }}
    >
      <View
        style={{
          height:
            170,

          position:
            "relative",
        }}
      >
        <ImageWithFallback
          uri={
            recipe?.image
          }

          style={{
            width:
              "100%",

            height:
              "100%",
          }}

          fallback="🍲"
        />


        <TouchableOpacity
          onPress={(event) => {
            event?.stopPropagation?.();

            onFavorite?.();
          }}

          style={{
            position:
              "absolute",

            top:
              12,

            right:
              12,

            width:
              40,

            height:
              40,

            borderRadius:
              20,

            alignItems:
              "center",

            justifyContent:
              "center",

            backgroundColor:
              "rgba(255,255,255,0.9)",
          }}
        >
          <Text
            style={{
              fontSize:
                20,
            }}
          >
            {favorite
              ? "♥️"
              : "♡"}
          </Text>
        </TouchableOpacity>


        {recipe?.pro ? (
          <View
            style={{
              position:
                "absolute",

              left:
                12,

              top:
                12,

              backgroundColor:
                COLORS.green,

              paddingHorizontal:
                10,

              paddingVertical:
                6,

              borderRadius:
                999,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.white,

                fontWeight:
                  "800",

                fontSize:
                  12,
              }}
            >
              PRO
            </Text>
          </View>
        ) : null}
      </View>


      <View
        style={{
          padding:
            16,
        }}
      >
        <Text
          style={{
            color:
              COLORS.text,

            fontSize:
              18,

            fontWeight:
              "800",
          }}
        >
          {recipe?.title ||
            "Без названия"}
        </Text>


        <Text
          style={{
            color:
              COLORS.muted,

            marginTop:
              5,

            fontSize:
              13,
          }}
        >
          {recipe?.category ||
            "Другое"}
          {" • "}
          {recipe?.time ||
            0}{" "}
          мин
          {" • "}
          {recipe?.servings ||
            1}{" "}
          пор.
        </Text>


        <Text
          style={{
            color:
              COLORS.text,

            marginTop:
              10,

            fontWeight:
              "700",
          }}
        >
          {roundNutrition(
            nutrition
              .perServing
              .kcal
          )}{" "}
          ккал / порция
        </Text>
      </View>
    </TouchableOpacity>
  );
}


/* =========================================================
   HEADER
========================================================= */

function AppHeader({
  title = "PaCook",
  subtitle = "Cook smart. Eat better.",
  onProfile,
}) {
  return (
    <View
      style={{
        flexDirection:
          "row",

        alignItems:
          "center",

        justifyContent:
          "space-between",

        marginBottom:
          18,
      }}
    >
      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={{
            fontSize:
              30,

            fontWeight:
              "900",

            color:
              COLORS.green,
          }}
        >
          {title}
        </Text>


        <Text
          style={{
            color:
              COLORS.muted,

            marginTop:
              2,

            fontSize:
              13,
          }}
        >
          {subtitle}
        </Text>
      </View>


      <TouchableOpacity
        onPress={
          onProfile
        }

        style={{
          width:
            48,

          height:
            48,

          borderRadius:
            24,

          backgroundColor:
            COLORS.lightGreen,

          alignItems:
            "center",

          justifyContent:
            "center",

          overflow:
            "hidden",
        }}
      >
        <Text
          style={{
            fontSize:
              23,
          }}
        >
          👨‍🍳
        </Text>
      </TouchableOpacity>
    </View>
  );
}


/* =========================================================
   SEARCH BAR
========================================================= */

function SearchBar({
  value,
  onChangeText,
  placeholder = "Поиск...",
}) {
  return (
    <View
      style={{
        backgroundColor:
          COLORS.card,

        borderRadius:
          16,

        borderWidth:
          1,

        borderColor:
          COLORS.border,

        paddingHorizontal:
          14,

        flexDirection:
          "row",

        alignItems:
          "center",

        marginBottom:
          16,
      }}
    >
      <Text
        style={{
          fontSize:
            18,

          marginRight:
            8,
        }}
      >
        🔎
      </Text>


      <TextInput
        value={
          value
        }

        onChangeText={
          onChangeText
        }

        placeholder={
          placeholder
        }

        placeholderTextColor={
          COLORS.muted
        }

        style={{
          flex: 1,

          paddingVertical:
            14,

          color:
            COLORS.text,

          fontSize:
            15,
        }}
      />
    </View>
  );
}


/* =========================================================
   FORM INPUT
========================================================= */

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}) {
  return (
    <View
      style={{
        marginBottom:
          14,
      }}
    >
      {label ? (
        <Text
          style={{
            color:
              COLORS.text,

            fontWeight:
              "700",

            marginBottom:
              7,

            fontSize:
              14,
          }}
        >
          {label}
        </Text>
      ) : null}


      <TextInput
        value={
          value
        }

        onChangeText={
          onChangeText
        }

        placeholder={
          placeholder
        }

        placeholderTextColor={
          COLORS.muted
        }

        multiline={
          multiline
        }

        keyboardType={
          keyboardType
        }

        style={{
          backgroundColor:
            COLORS.card,

          borderWidth:
            1,

          borderColor:
            COLORS.border,

          borderRadius:
            14,

          paddingHorizontal:
            14,

          paddingVertical:
            13,

          minHeight:
            multiline
              ? 100
              : undefined,

          color:
            COLORS.text,

          textAlignVertical:
            multiline
              ? "top"
              : "center",
        }}
      />
    </View>
  );
}


/* =========================================================
   CONFIRM DELETE
========================================================= */

function confirmDelete(
  title,
  message,
  onConfirm
) {
  Alert.alert(
    title,
    message,
    [
      {
        text:
          "Отмена",

        style:
          "cancel",
      },

      {
        text:
          "Удалить",

        style:
          "destructive",

        onPress:
          onConfirm,
      },
    ]
  );
}


/* =========================================================
   ROOT APP START
========================================================= */

export default function App() {
  const [
    authUser,
    setAuthUser,
  ] = useState(null);


  const [
    authChecked,
    setAuthChecked,
  ] = useState(false);

   const [
    authEmailState,
    setAuthEmailState,
  ] = useState("");


  const [
    authPasswordState,
    setAuthPasswordState,
  ] = useState("");


  const [
    authNameState,
    setAuthNameState,
  ] = useState("");


  const [
    authMode,
    setAuthMode,
  ] = useState("login");


  const [
    authLoading,
    setAuthLoading,
  ] = useState(false);


  const [
    authError,
    setAuthError,
  ] = useState("");

  const [
    products,
    setProducts,
  ] = useState(
    ALL_INITIAL_PRODUCTS
  );


  const [
    recipes,
    setRecipes,
  ] = useState(
    INITIAL_RECIPES
  );


  const [
    favorites,
    setFavorites,
  ] = useState([]);


  const [
    diary,
    setDiary,
  ] = useState([]);


  const [
    deletedProducts,
    setDeletedProducts,
  ] = useState([]);


  const [
    deletedRecipes,
    setDeletedRecipes,
  ] = useState([]);


  const [
    profile,
    setProfile,
  ] = useState({
    name:
      "PaCook User",

    avatarUrl:
      "",

    bio:
      "",

    city:
      "",

    age:
      "",

    goal:
      "",
  });


  const [
    settings,
    setSettings,
  ] = useState(
    DEFAULT_SETTINGS
  );


  const [
    screen,
    setScreen,
  ] = useState(
    "home"
  );


  const [
    selectedRecipeId,
    setSelectedRecipeId,
  ] = useState(null);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    recipeCategory,
    setRecipeCategory,
  ] = useState(
    "Все"
  );


  const [
    productsSearch,
    setProductsSearch,
  ] = useState("");


  const [
    authorMode,
    setAuthorMode,
  ] = useState(false);


  const [
    authorUnlocked,
    setAuthorUnlocked,
  ] = useState(false);


  const [
    loadingData,
    setLoadingData,
  ] = useState(true);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    editingProductName,
    setEditingProductName,
  ] = useState(null);


  const [
    editingRecipeId,
    setEditingRecipeId,
  ] = useState(null);


  const [
    productForm,
    setProductForm,
  ] = useState({
    name:
      "",

    kcal:
      "",

    protein:
      "",

    fat:
      "",

    carbs:
      "",
  });


  const [
    recipeForm,
    setRecipeForm,
  ] = useState({
    title:
      "",

    category:
      "Основные блюда",

    time:
      "30",

    servings:
      "2",

    image:
      "",

    description:
      "",

    pro:
      false,

    ingredients: [
      {
        product:
          "",

        grams:
          "",
      },
    ],

    steps: [
      "",
    ],
  });


  const [
    profileForm,
    setProfileForm,
  ] = useState(
    profile
  );


  const [
    diaryDay,
    setDiaryDay,
  ] = useState(
    "Понедельник"
  );


  const [
    diaryTarget,
    setDiaryTarget,
  ] = useState(
    "2000"
  );


  const [
    diaryMeal,
    setDiaryMeal,
  ] = useState(
    "Завтрак"
  );


  const [
    diaryRecipeId,
    setDiaryRecipeId,
  ] = useState(
    ""
  );


  const [
    diaryTime,
    setDiaryTime,
  ] = useState(
    "08:00"
  );


  const [
    editingDiaryId,
    setEditingDiaryId,
  ] = useState(
    null
  );


  /* =======================================================
     INSTALL GLOBAL ERROR HANDLER
  ======================================================= */

  useEffect(() => {
    installGlobalErrorHandler();
  }, []);


  /* =======================================================
     RESTORE AUTH
  ======================================================= */

  useEffect(() => {
    let mounted =
      true;


    async function restore() {
      try {
        const user =
          await restorePaCookSession();


        if (
          mounted
        ) {
          setAuthUser(
            user
          );
        }
      } catch (error) {
        console.log(
          "AUTH RESTORE ERROR:",
          error
        );
      } finally {
        if (
          mounted
        ) {
          setAuthChecked(
            true
          );
        }
      }
    }


    restore();


    const {
      data:
        subscriptionData,
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
          if (
            !mounted
          ) {
            return;
          }


          if (
            session?.user
          ) {
            setAuthUser(
              session.user
            );


            try {
              await AsyncStorage.setItem(
                STORAGE_KEYS.session,
                JSON.stringify({
                  access_token:
                    session.access_token,

                  refresh_token:
                    session.refresh_token,

                  expires_at:
                    session.expires_at,

                  expires_in:
                    session.expires_in,

                  token_type:
                    session.token_type,

                  user:
                    session.user,
                })
              );
            } catch {}
          } else if (
            event ===
            "SIGNED_OUT"
          ) {
            setAuthUser(
              null
            );


            try {
              await AsyncStorage.removeItem(
                STORAGE_KEYS.session
              );
            } catch {}
          }
        }
      );


    return () => {
      mounted =
        false;

      subscriptionData
        ?.subscription
        ?.unsubscribe?.();
    };
  }, []);


  /* =======================================================
   LOAD LOCAL DATA
======================================================= */

useEffect(() => {
  let mounted = true;

  async function loadData() {
    try {
      setLoadingData(true);

      const [
        localData,
        localProfile,
        localSettings,
      ] = await Promise.all([
        loadLocalPaCookData(),
        loadLocalProfile(),
        loadSettings(),
      ]);

      if (!mounted) {
        return;
      }

      /*
         Всегда приводим локальные продукты
         к массиву перед объединением.
      */

      const localProducts =
        ensureProductsArray(
          localData?.products
        );

      /*
         Объединяем стартовые продукты
         с локальными изменениями.
      */

      const mergedProducts =
        mergeProducts(
          ALL_INITIAL_PRODUCTS,
          localProducts,
          Array.isArray(
            localData?.deletedProducts
          )
            ? localData.deletedProducts
            : []
        );

      /*
         Дополнительная защита:
         products в state НИКОГДА
         не должен стать объектом.
      */

      const safeProducts =
        Array.isArray(
          mergedProducts
        )
          ? mergedProducts
          : [
              ...ALL_INITIAL_PRODUCTS,
            ];

      /*
         Рецепты.
      */

      const mergedRecipes =
        mergeRecipes(
          INITIAL_RECIPES,
          Array.isArray(
            localData?.recipes
          )
            ? localData.recipes
            : [],
          Array.isArray(
            localData?.deletedRecipes
          )
            ? localData.deletedRecipes
            : []
        );

      const safeRecipes =
        Array.isArray(
          mergedRecipes
        )
          ? mergedRecipes
          : [
              ...INITIAL_RECIPES,
            ];

      setProducts(
        safeProducts
      );

      setRecipes(
        safeRecipes
      );

      setFavorites(
        Array.isArray(
          localData?.favorites
        )
          ? localData.favorites
          : []
      );

      setDiary(
        Array.isArray(
          localData?.diary
        )
          ? localData.diary
          : []
      );

      setDeletedProducts(
        Array.isArray(
          localData?.deletedProducts
        )
          ? localData.deletedProducts
          : []
      );

      setDeletedRecipes(
        Array.isArray(
          localData?.deletedRecipes
        )
          ? localData.deletedRecipes
          : []
      );

      setProfile(
        localProfile
      );

      setProfileForm(
        localProfile
      );

      setSettings(
        localSettings
      );

    } catch (error) {
      console.log(
        "LOAD DATA ERROR:",
        error
      );

      /*
         Даже при ошибке загрузки
         products остаётся массивом.
      */

      if (mounted) {
        setProducts([
          ...ALL_INITIAL_PRODUCTS,
        ]);

        setRecipes([
          ...INITIAL_RECIPES,
        ]);
      }

    } finally {
      if (mounted) {
        setLoadingData(
          false
        );
      }
    }
  }

  loadData();

  return () => {
    mounted = false;
  };
}, []);


  /* =======================================================
   LOAD SUPABASE DATA
======================================================= */

useEffect(() => {
  let mounted = true;

  async function loadRemoteData() {
    /*
       Пока пользователь не вошёл,
       не читаем пользовательские данные.
    */

    if (!authUser?.id) {
      return;
    }

    try {
      const [
        remoteProducts,
        remoteRecipes,
        remoteProfile,
      ] = await Promise.all([
        getSupabaseProducts().catch(
          () => []
        ),

        getSupabaseRecipes().catch(
          () => []
        ),

        getProfile(
          authUser.id
        ),
      ]);

      if (!mounted) {
        return;
      }

      /* =================================================
         PRODUCTS

         products в приложении всегда МАССИВ.

         Локальные продукты имеют приоритет.
         Продукты из Supabase добавляются только
         если такого продукта ещё нет локально.
      ================================================= */

      setProducts(
        (current) => {
          const currentArray =
            ensureProductsArray(
              current
            );

          const remoteArray =
            ensureProductsArray(
              remoteProducts
            );

          const productMap =
            new Map();

          /*
             Сначала локальные продукты.
             Они имеют приоритет.
          */

          currentArray.forEach(
            (product) => {
              const normalized =
                normalizeProduct(
                  product
                );

              if (
                normalized?.name
              ) {
                productMap.set(
                  normalized.name,
                  normalized
                );
              }
            }
          );

          /*
             Затем добавляем продукты
             из Supabase, только если
             такого имени ещё нет.
          */

          remoteArray.forEach(
            (product) => {
              const normalized =
                normalizeProduct(
                  product
                );

              if (
                !normalized?.name
              ) {
                return;
              }

              if (
                !productMap.has(
                  normalized.name
                )
              ) {
                productMap.set(
                  normalized.name,
                  normalized
                );
              }
            }
          );

          return Array.from(
            productMap.values()
          );
        }
      );

      /* =================================================
         RECIPES
      ================================================= */

      setRecipes(
        (current) => {
          const currentRecipes =
            Array.isArray(
              current
            )
              ? normalizeRecipes(
                  current
                )
              : [];

          const remote =
            normalizeRecipes(
              remoteRecipes
            );

          const currentById =
            new Map();

          currentRecipes.forEach(
            (recipe) => {
              currentById.set(
                String(
                  recipe.id
                ),
                recipe
              );
            }
          );

          /*
             Локальные рецепты имеют приоритет.
             Поэтому удалённые добавляем только
             если такого id ещё нет.
          */

          remote.forEach(
            (recipe) => {
              const id =
                String(
                  recipe.id
                );

              if (
                !currentById.has(
                  id
                )
              ) {
                currentById.set(
                  id,
                  recipe
                );
              }
            }
          );

          return Array.from(
            currentById.values()
          );
        }
      );

      /* =================================================
         PROFILE
      ================================================= */

      if (remoteProfile) {
        const nextProfile = {
          ...profile,

          name:
            remoteProfile.name ||
            profile.name,

          avatarUrl:
            remoteProfile.avatar_url ||
            profile.avatarUrl,
        };

        setProfile(
          nextProfile
        );

        setProfileForm(
          nextProfile
        );

        await saveLocalProfile(
          nextProfile
        );
      }

    } catch (error) {
      console.log(
        "REMOTE DATA LOAD ERROR:",
        error
      );
    }
  }

  loadRemoteData();

  return () => {
    mounted = false;
  };
}, [
  authUser?.id,
]);

  /* =======================================================
   PERSIST DATA
======================================================= */

useEffect(() => {
  if (loadingData) {
    return;
  }

  saveLocalPaCookData({
    products:
      ensureProductsArray(
        products
      ),

    recipes:
      Array.isArray(
        recipes
      )
        ? recipes
        : [],

    favorites:
      Array.isArray(
        favorites
      )
        ? favorites
        : [],

    diary:
      Array.isArray(
        diary
      )
        ? diary
        : [],

    deletedProducts:
      Array.isArray(
        deletedProducts
      )
        ? deletedProducts
        : [],

    deletedRecipes:
      Array.isArray(
        deletedRecipes
      )
        ? deletedRecipes
        : [],
  });
}, [
  products,
  recipes,
  favorites,
  diary,
  deletedProducts,
  deletedRecipes,
  loadingData,
]);


  /* =======================================================
     PERSIST SETTINGS
  ======================================================= */

  useEffect(() => {
    if (
      loadingData
    ) {
      return;
    }


    saveSettings(
      settings
    );
  }, [
    settings,
    loadingData,
  ]);


  /* =======================================================
     UPDATE PROFILE FORM WHEN PROFILE CHANGES
  ======================================================= */

  useEffect(() => {
    setProfileForm(
      profile
    );
  }, [
    profile,
  ]);


  /* =======================================================
     CURRENT RECIPE
  ======================================================= */

  const selectedRecipe =
    useMemo(
      () =>
        recipes.find(
          (recipe) =>
            String(
              recipe.id
            ) ===
            String(
              selectedRecipeId
            )
        ) ||
        null,
      [
        recipes,
        selectedRecipeId,
      ]
    );


  /* =======================================================
     RECIPE CATEGORIES
  ======================================================= */

  const recipeCategories =
    useMemo(() => {
      const categories =
        recipes
          .map(
            (recipe) =>
              recipe.category
          )
          .filter(
            Boolean
          );


      return [
        "Все",
        ...Array.from(
          new Set(
            categories
          )
        ),
      ];
    }, [
      recipes,
    ]);


  /* =======================================================
     FILTERED RECIPES
  ======================================================= */

  const filteredRecipes =
    useMemo(() => {
      const query =
        cleanString(
          search
        ).toLowerCase();


      return recipes.filter(
        (recipe) => {
          const matchesSearch =
            !query ||
            cleanString(
              recipe.title
            )
              .toLowerCase()
              .includes(
                query
              ) ||
            cleanString(
              recipe.category
            )
              .toLowerCase()
              .includes(
                query
              );


          const matchesCategory =
            recipeCategory ===
              "Все" ||
            recipe.category ===
              recipeCategory;


          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      recipes,
      search,
      recipeCategory,
    ]);

/* =======================================================
   FILTERED PRODUCTS
======================================================= */

const filteredProducts =
  useMemo(() => {
    const query =
      cleanString(
        productsSearch
      ).toLowerCase();

    const productsArray =
      ensureProductsArray(
        products
      );

    return productsArray
      .filter(
        (product) => {
          const name =
            cleanString(
              product?.name
            );

          return (
            !query ||
            name
              .toLowerCase()
              .includes(
                query
              )
          );
        }
      )
      .sort(
        (a, b) =>
          cleanString(
            a?.name
          ).localeCompare(
            cleanString(
              b?.name
            ),
            "ru"
          )
      );
  }, [
    products,
    productsSearch,
  ]);
  
  /* =======================================================
     FAVORITE CHECK
  ======================================================= */

  function isFavorite(
    recipeId
  ) {
    return favorites.some(
      (id) =>
        String(id) ===
        String(
          recipeId
        )
    );
  }


  /* =======================================================
     TOGGLE FAVORITE
  ======================================================= */

  function toggleFavorite(
    recipeId
  ) {
    setFavorites(
      (
        current
      ) => {
        const exists =
          current.some(
            (id) =>
              String(
                id
              ) ===
              String(
                recipeId
              )
          );


        if (exists) {
          return current.filter(
            (id) =>
              String(
                id
              ) !==
              String(
                recipeId
              )
          );
        }


        return [
          ...current,
          recipeId,
        ];
      }
    );
  }
  // ============================================================
  // NAVIGATION
  // ============================================================

  function goHome() {
    setScreen("home");
    setSelectedRecipeId(null);
    setSearch("");
  }

  function goRecipes() {
    setScreen("recipes");
    setSelectedRecipeId(null);
  }

  function goProducts() {
    setScreen("products");
    setSelectedRecipeId(null);
  }

  function goFavorites() {
    setScreen("favorites");
    setSelectedRecipeId(null);
  }

  function goDiary() {
    setScreen("diary");
    setSelectedRecipeId(null);
  }

  function goProfile() {
    setScreen("profile");
    setSelectedRecipeId(null);
  }

  function goAuthor() {
    setScreen("author");
    setSelectedRecipeId(null);
  }

  function goSettings() {
    setScreen("settings");
    setSelectedRecipeId(null);
  }

  function openRecipe(recipeId) {
    setSelectedRecipeId(recipeId);
    setScreen("recipe");
  }

  function closeRecipe() {
    setSelectedRecipeId(null);
    setScreen("recipes");
  }

  // ============================================================
  // LOCAL SAVE
  // ============================================================

  async function persistEverything(nextValues = {}) {
    try {
      const payload = {
        products:
          nextValues.products !== undefined
            ? nextValues.products
            : products,

        recipes:
          nextValues.recipes !== undefined
            ? nextValues.recipes
            : recipes,

        favorites:
          nextValues.favorites !== undefined
            ? nextValues.favorites
            : favorites,

        diary:
          nextValues.diary !== undefined
            ? nextValues.diary
            : diary,

        deletedProducts:
          nextValues.deletedProducts !== undefined
            ? nextValues.deletedProducts
            : deletedProducts,

        deletedRecipes:
          nextValues.deletedRecipes !== undefined
            ? nextValues.deletedRecipes
            : deletedRecipes,

        profile:
          nextValues.profile !== undefined
            ? nextValues.profile
            : profile,

        settings:
          nextValues.settings !== undefined
            ? nextValues.settings
            : settings,
      };

      await saveLocalPaCookData(payload);
    } catch (error) {
      console.log(
        "PaCook local save error:",
        error
      );
    }
  }

  // ============================================================
  // SUPABASE SAFE HELPERS
  // ============================================================

  async function safeSupabaseUpsert(
    table,
    rows
  ) {
    if (!authUser) {
      return false;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return true;
    }

    try {
      const preparedRows = rows.map(
        (row) => ({
          ...row,

          user_id:
            row.user_id ||
            authUser.id,

          updated_at:
            new Date().toISOString(),
        })
      );

      const result =
        await supabase
          .from(table)
          .upsert(
            preparedRows,
            {
              onConflict: "id",
            }
          );

      if (result.error) {
        console.log(
          `Supabase ${table} upsert error:`,
          result.error
        );

        return false;
      }

      return true;
    } catch (error) {
      console.log(
        `Supabase ${table} exception:`,
        error
      );

      return false;
    }
  }

  async function safeSupabaseDelete(
    table,
    id
  ) {
    if (!authUser || !id) {
      return false;
    }

    try {
      const result =
        await supabase
          .from(table)
          .delete()
          .eq(
            "id",
            String(id)
          );

      if (result.error) {
        console.log(
          `Supabase ${table} delete error:`,
          result.error
        );

        return false;
      }

      return true;
    } catch (error) {
      console.log(
        `Supabase ${table} delete exception:`,
        error
      );

      return false;
    }
  }

  // ============================================================
// PRODUCT SAVE
// ============================================================

async function saveProduct() {
  try {
    const name =
      String(
        productForm.name || ""
      ).trim();

    if (!name) {
      if (
        typeof window !== "undefined" &&
        window.alert
      ) {
        window.alert(
          "Введите название продукта."
        );
      }

      return;
    }

    const kcal =
      Number(productForm.kcal) || 0;

    const protein =
      Number(productForm.protein) || 0;

    const fat =
      Number(productForm.fat) || 0;

    const carbs =
      Number(productForm.carbs) || 0;

    const fiber =
      Number(productForm.fiber) || 0;

    const category =
      String(
        productForm.category ||
          "Другое"
      ).trim();

    const image =
      String(
        productForm.image || ""
      ).trim();

    const oldName =
      editingProductName
        ? String(
            editingProductName
          )
        : null;

    // Всегда работаем с массивом
    const productsArray =
      ensureProductsArray(
        products
      );

    // Проверяем дубликат названия
    const existing =
      productsArray.find(
        (item) =>
          String(
            item?.name || ""
          ).toLowerCase() ===
            name.toLowerCase() &&
          String(
            item?.name || ""
          ).toLowerCase() !==
            String(
              oldName || ""
            ).toLowerCase()
      );

    if (existing) {
      if (
        typeof window !== "undefined" &&
        window.alert
      ) {
        window.alert(
          "Продукт с таким названием уже существует."
        );
      }

      return;
    }

    // Если редактируем существующий продукт —
    // сохраняем его ID
    const existingProduct =
      oldName
        ? productsArray.find(
            (item) =>
              String(
                item?.name || ""
              ) ===
              String(
                oldName
              )
          )
        : null;

    const product = {
      id:
        existingProduct?.id ||
        `user-product-${Date.now()}`,

      name,

      category,

      kcal,

      protein,

      fat,

      carbs,

      fiber,

      image,

      custom: true,

      author_id:
        authUser?.id ||
        null,

      updated_at:
        new Date().toISOString(),
    };

    let nextProducts = [
      ...productsArray,
    ];

    if (oldName) {
      nextProducts =
        nextProducts.map(
          (item) =>
            String(
              item?.name || ""
            ) ===
            String(
              oldName
            )
              ? product
              : item
        );
    } else {
      nextProducts.push(
        product
      );
    }

    // Финальная защита:
    // products всегда должен быть массивом
    nextProducts =
      ensureProductsArray(
        nextProducts
      );

    setProducts(
      nextProducts
    );

    // deletedProducts хранит имена,
    // поэтому удаляем именно старое имя
    const nextDeletedProducts =
      Array.isArray(
        deletedProducts
      )
        ? deletedProducts.filter(
            (item) =>
              String(
                item
              ) !==
              String(
                oldName || ""
              )
          )
        : [];

    setDeletedProducts(
      nextDeletedProducts
    );

    setEditingProductName(
      null
    );

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

    await persistEverything({
      products:
        nextProducts,

      deletedProducts:
        nextDeletedProducts,
    });

    if (authUser) {
      await safeSupabaseUpsert(
        "products",
        [product]
      );
    }

    setSaving(false);

    setScreen("author");

  } catch (error) {
    console.log(
      "SAVE PRODUCT ERROR:",
      error
    );

    setSaving(false);

    if (
      typeof window !== "undefined" &&
      window.alert
    ) {
      window.alert(
        "Не удалось сохранить продукт: " +
          String(
            error?.message ||
              error
          )
      );
    }
  }
}

  // ============================================================
  // START PRODUCT EDIT
  // ============================================================

  function startEditProduct(
    product
  ) {
    if (!product) {
      return;
    }

    setEditingProductName(
      product.name
    );

    setProductForm({
      name:
        product.name || "",

      category:
        product.category ||
        "Другое",

      kcal:
        String(
          product.kcal ?? ""
        ),

      protein:
        String(
          product.protein ?? ""
        ),

      fat:
        String(
          product.fat ?? ""
        ),

      carbs:
        String(
          product.carbs ?? ""
        ),

      fiber:
        String(
          product.fiber ?? ""
        ),

      image:
        product.image || "",
    });

    setScreen("authorProduct");
  }

  // ============================================================
  // START NEW PRODUCT
  // ============================================================

  function startNewProduct() {
    setEditingProductName(
      null
    );

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

    setScreen("authorProduct");
  }

 // ============================================================
// DELETE PRODUCT
// ============================================================

async function removeProduct(
  product
) {
  if (!product) {
    return;
  }

  const confirmed =
    await confirmDelete(
      `Удалить продукт «${product.name}»?`
    );

  if (!confirmed) {
    return;
  }

  const productId =
    product.id;

  // Всегда работаем с массивом
  const productsArray =
    ensureProductsArray(
      products
    );

  const nextProducts =
    productsArray.filter(
      (item) =>
        String(
          item?.id
        ) !==
        String(
          productId
        )
    );

  // deletedProducts храним по ID
  const deletedArray =
    Array.isArray(
      deletedProducts
    )
      ? deletedProducts
      : [];

  const nextDeletedProducts = [
    ...deletedArray,
    productId,
  ].filter(
    (value, index, array) =>
      array.findIndex(
        (item) =>
          String(
            item
          ) ===
          String(
            value
          )
      ) === index
  );

  setProducts(
    nextProducts
  );

  setDeletedProducts(
    nextDeletedProducts
  );

  await persistEverything({
    products:
      nextProducts,

    deletedProducts:
      nextDeletedProducts,
  });

  if (authUser) {
    await safeSupabaseDelete(
      "products",
      productId
    );
  }

  if (
    editingProductName ===
    product.name
  ) {
    setEditingProductName(
      null
    );
  }
}

  // ============================================================
// RECIPE SAVE
// ============================================================

async function saveRecipe() {
  try {
    const title =
      String(
        recipeForm.title || ""
      ).trim();

    if (!title) {
      if (
        typeof window !== "undefined" &&
        window.alert
      ) {
        window.alert(
          "Введите название рецепта."
        );
      }

      return;
    }

    const category =
      String(
        recipeForm.category ||
          "Другое"
      ).trim();

    const description =
      String(
        recipeForm.description ||
          ""
      ).trim();

    const image =
      String(
        recipeForm.image || ""
      ).trim();

    const productsArray =
      ensureProductsArray(
        products
      );

    const recipeArray =
      Array.isArray(
        recipes
      )
        ? normalizeRecipes(
            recipes
          )
        : [];

    // ----------------------------------------------------------
    // INGREDIENTS
    // ----------------------------------------------------------

    const ingredients =
      Array.isArray(
        recipeForm.ingredients
      )
        ? recipeForm.ingredients
            .map(
              (item) => {
                const productId =
                  String(
                    item?.productId ||
                      item?.product_id ||
                      ""
                  ).trim();

                const productName =
                  String(
                    item?.product ||
                      item?.productName ||
                      ""
                  ).trim();

                const grams =
                  Number(
                    item?.grams ??
                      item?.amount ??
                      0
                  ) || 0;

                // Если форма хранит ID,
                // находим настоящее название продукта
                const foundProduct =
                  productId
                    ? productsArray.find(
                        (product) =>
                          String(
                            product?.id
                          ) ===
                          productId
                      )
                    : null;

                const finalProductName =
                  productName ||
                  foundProduct?.name ||
                  "";

                return {
                  product:
                    finalProductName,

                  productId,

                  product_id:
                    productId,

                  grams,

                  amount:
                    grams,
                };
              }
            )
            .filter(
              (item) =>
                item.product &&
                item.grams > 0
            )
        : [];

    // ----------------------------------------------------------
    // STEPS
    // ----------------------------------------------------------

    const steps =
      Array.isArray(
        recipeForm.steps
      )
        ? recipeForm.steps
            .map(
              (step) =>
                String(
                  step || ""
                ).trim()
            )
            .filter(Boolean)
        : String(
            recipeForm.steps || ""
          )
            .split("\n")
            .map(
              (step) =>
                step.trim()
            )
            .filter(Boolean);

    // ----------------------------------------------------------
    // RECIPE ID
    // ----------------------------------------------------------

    const recipeId =
      editingRecipeId ||
      `user-recipe-${Date.now()}`;

    // ----------------------------------------------------------
    // EXISTING RECIPE
    // ----------------------------------------------------------

    const existingRecipe =
      recipeArray.find(
        (item) =>
          String(
            item?.id
          ) ===
          String(
            recipeId
          )
      ) || null;

    // ----------------------------------------------------------
    // RECIPE
    // ----------------------------------------------------------

    const recipe = {
      ...(existingRecipe || {}),

      id:
        recipeId,

      title,

      name:
        title,

      category,

      description,

      image,

      image_url:
        image,

      ingredients,

      steps,

      pro:
        Boolean(
          recipeForm.pro
        ),

      servings:
        Number(
          recipeForm.servings
        ) || 1,

      prepTime:
        Number(
          recipeForm.prepTime
        ) || 0,

      cookTime:
        Number(
          recipeForm.cookTime
        ) || 0,

      custom: true,

      author_id:
        authUser?.id ||
        existingRecipe?.author_id ||
        null,

      updated_at:
        new Date().toISOString(),
    };

    // ----------------------------------------------------------
    // NEXT RECIPES
    // ----------------------------------------------------------

    const recipesWithoutCurrent =
      recipeArray.filter(
        (item) =>
          String(
            item?.id
          ) !==
          String(
            recipeId
          )
      );

    const nextRecipes =
      mergeRecipes(
        recipesWithoutCurrent,
        [recipe],
        []
      );

    const deletedArray =
      Array.isArray(
        deletedRecipes
      )
        ? deletedRecipes
        : [];

    const nextDeletedRecipes =
      deletedArray.filter(
        (item) =>
          String(
            item
          ) !==
          String(
            recipeId
          )
      );

    // ----------------------------------------------------------
    // STATE
    // ----------------------------------------------------------

    setRecipes(
      Array.isArray(
        nextRecipes
      )
        ? nextRecipes
        : [
            ...recipeArray,
          ]
    );

    setDeletedRecipes(
      nextDeletedRecipes
    );

    setEditingRecipeId(
      null
    );

    // ----------------------------------------------------------
    // RESET FORM
    // ----------------------------------------------------------

    setRecipeForm({
      title: "",
      category: "Другое",
      description: "",
      image: "",
      ingredients: [
        {
          product: "",
          productId: "",
          product_id: "",
          grams: "",
        },
      ],
      steps: [""],
      pro: false,
      servings: 1,
      prepTime: 0,
      cookTime: 0,
    });

    // ----------------------------------------------------------
    // LOCAL SAVE
    // ----------------------------------------------------------

    await persistEverything({
      recipes:
        Array.isArray(
          nextRecipes
        )
          ? nextRecipes
          : recipeArray,

      deletedRecipes:
        nextDeletedRecipes,
    });

    // ----------------------------------------------------------
    // SUPABASE SAVE
    // ----------------------------------------------------------

    if (authUser) {
      await safeSupabaseUpsert(
        "recipes",
        [
          {
            ...recipe,

            user_id:
              authUser.id,
          },
        ]
      );
    }

    setSaving(false);

    setScreen("author");

  } catch (error) {
    console.log(
      "SAVE RECIPE ERROR:",
      error
    );

    setSaving(false);

    if (
      typeof window !== "undefined" &&
      window.alert
    ) {
      window.alert(
        "Не удалось сохранить рецепт: " +
          String(
            error?.message ||
              error
          )
      );
    }
  }
}

  // ============================================================
// START RECIPE EDIT
// ============================================================

function startEditRecipe(
  recipe
) {
  if (!recipe) {
    return;
  }

  const productsArray =
    ensureProductsArray(
      products
    );

  const sourceIngredients =
    Array.isArray(
      recipe.ingredients
    )
      ? recipe.ingredients
      : [];

  const normalizedIngredients =
    sourceIngredients.map(
      (item) => {
        const productId =
          String(
            item?.productId ||
              item?.product_id ||
              item?.product?.id ||
              ""
          ).trim();

        const productName =
          String(
            typeof item?.product ===
              "string"
              ? item.product
              : item?.productName ||
                ""
          ).trim();

        const foundProduct =
          productId
            ? productsArray.find(
                (product) =>
                  String(
                    product?.id
                  ) ===
                  productId
              )
            : null;

        const finalProductName =
          productName ||
          foundProduct?.name ||
          "";

        return {
          product:
            finalProductName,

          productId,

          product_id:
            productId,

          grams:
            Number(
              item?.grams ??
                item?.amount ??
                item?.weight ??
                0
            ) || 0,

          amount:
            Number(
              item?.grams ??
                item?.amount ??
                item?.weight ??
                0
            ) || 0,
        };
      }
    );

  const sourceSteps =
    Array.isArray(
      recipe.steps
    )
      ? recipe.steps
      : [];

  setEditingRecipeId(
    recipe.id
  );

  setRecipeForm({
    title:
      recipe.title ||
      recipe.name ||
      "",

    category:
      recipe.category ||
      "Другое",

    description:
      recipe.description ||
      "",

    image:
      recipe.image ||
      recipe.image_url ||
      "",

    ingredients:
      normalizedIngredients.length
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

    steps:
      sourceSteps.length
        ? sourceSteps
        : [""],

    pro:
      Boolean(
        recipe.pro
      ),

    servings:
      Number(
        recipe.servings
      ) || 1,

    prepTime:
      Number(
        recipe.prepTime
      ) || 0,

    cookTime:
      Number(
        recipe.cookTime
      ) || 0,
  });

  setScreen(
    "authorRecipe"
  );
}

  // ============================================================
// START NEW RECIPE
// ============================================================

function startNewRecipe() {
  setEditingRecipeId(
    null
  );

  setRecipeForm({
    title: "",
    category: "Другое",
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

    steps: [
      "",
    ],

    pro: false,
    servings: 1,
    prepTime: 0,
    cookTime: 0,
  });

  setScreen(
    "authorRecipe"
  );
}

 // ============================================================
 // DELETE RECIPE
 // ============================================================

async function removeRecipe(
  recipe
) {
  if (!recipe) {
    return;
  }
  const title =
    recipe.title ||
    recipe.name ||
    "рецепт";
  const confirmed =
    await confirmDelete(
      `Удалить рецепт «${title}»?`
    );
  if (!confirmed) {
    return;
  }
  const recipeId =
    recipe.id;
  // Всегда работаем с массивом
  const recipesArray =
    Array.isArray(
      recipes
    )
      ? recipes
      : [];
  const nextRecipes =
    recipesArray.filter(
      (item) =>
        String(
          item?.id
        ) !==
        String(
          recipeId
        )
    );
  // deletedRecipes всегда массив
  const deletedArray =
    Array.isArray(
      deletedRecipes
    )
      ? deletedRecipes
      : [];
  const nextDeletedRecipes = [
    ...deletedArray,
    recipeId,
  ].filter(
    (value, index, array) =>
      array.findIndex(
        (item) =>
          String(
            item
          ) ===
          String(
            value
          )
      ) === index
  );
  // Убираем рецепт из избранного
  const favoritesArray =
    Array.isArray(
      favorites
    )
      ? favorites
      : [];
  const nextFavorites =
    favoritesArray.filter(
      (id) =>
        String(
          id
        ) !==
        String(
          recipeId
        )
    );
  setRecipes(
    nextRecipes
  );
  setDeletedRecipes(
    nextDeletedRecipes
  );
  setFavorites(
    nextFavorites
  );
  await persistEverything({
    recipes:
      nextRecipes,
    deletedRecipes:
      nextDeletedRecipes,
    favorites:
      nextFavorites,
  });
  if (authUser) {
    await safeSupabaseDelete(
      "recipes",
      recipeId
    );
  }
  if (
    String(
      selectedRecipeId
    ) ===
    String(
      recipeId
    )
  ) {
    setSelectedRecipeId(
      null
    );
  }
}

  // ============================================================
  // PROFILE SAVE
  // ============================================================

  async function saveProfile() {
    const nextProfile = {
      ...profile,

      name:
        String(
          profileForm.name || ""
        ).trim() ||
        "PaCook User",

      username:
        String(
          profileForm.username ||
            ""
        ).trim(),

      bio:
        String(
          profileForm.bio || ""
        ).trim(),

      avatar:
        String(
          profileForm.avatar || ""
        ).trim(),

      photo:
        String(
          profileForm.avatar || ""
        ).trim(),

      city:
        String(
          profileForm.city || ""
        ).trim(),

      updated_at:
        new Date().toISOString(),
    };

    setProfile(
      nextProfile
    );

    await persistEverything({
      profile:
        nextProfile,
    });

    if (authUser) {
      try {
        const profileRow = {
          id:
            authUser.id,

          user_id:
            authUser.id,

          name:
            nextProfile.name,

          username:
            nextProfile.username,

          bio:
            nextProfile.bio,

          avatar:
            nextProfile.avatar,

          photo:
            nextProfile.photo,

          city:
            nextProfile.city,

          updated_at:
            new Date().toISOString(),
        };

        const result =
          await supabase
            .from("profiles")
            .upsert(
              profileRow,
              {
                onConflict:
                  "id",
              }
            );

        if (result.error) {
          console.log(
            "Profile Supabase save error:",
            result.error
          );
        }
      } catch (error) {
        console.log(
          "Profile Supabase exception:",
          error
        );
      }
    }

    setScreen("profile");
  }

  // ============================================================
  // PROFILE EDIT
  // ============================================================

  function startEditProfile() {
    setProfileForm({
      name:
        profile?.name ||
        authUser?.user_metadata
          ?.name ||
        "PaCook User",

      username:
        profile?.username ||
        "",

      bio:
        profile?.bio ||
        "",

      avatar:
        profile?.avatar ||
        profile?.photo ||
        authUser?.user_metadata
          ?.avatar ||
        "",

      city:
        profile?.city ||
        "",
    });

    setScreen(
      "profileEdit"
    );
  }

  // ============================================================
// LOGOUT
// IMPORTANT: ONLY ONE logoutUser FUNCTION
// ============================================================

async function logoutUser() {
  try {
    await AsyncStorage.removeItem(
      STORAGE_KEYS.session
    );
  } catch (error) {
    console.log(
      "Session remove error:",
      error
    );
  }

  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.log(
      "Supabase logout error:",
      error
    );
  }

  setAuthUser(null);
  setAuthorMode(false);
  setAuthorUnlocked(false);
  setScreen("home");
}

  // ============================================================
// DIARY
// ============================================================

function getDiaryForDay(
  day
) {
  const diaryArray =
    Array.isArray(
      diary
    )
      ? diary
      : [];

  return diaryArray.filter(
    (item) =>
      Number(
        item?.day
      ) ===
      Number(
        day
      )
  );
}

function getDiaryCalories(
  day
) {
  const dayItems =
    getDiaryForDay(
      day
    );

  const recipesArray =
    Array.isArray(
      recipes
    )
      ? recipes
      : [];

  const productsArray =
    ensureProductsArray(
      products
    );

  return dayItems.reduce(
    (
      total,
      item
    ) => {
      const recipe =
        recipesArray.find(
          (recipeItem) =>
            String(
              recipeItem?.id
            ) ===
            String(
              item?.recipeId
            )
        );

      if (!recipe) {
        return total;
      }

      const nutrition =
        calculateRecipeNutrition(
          recipe,
          productsArray
        );

      const servings =
        Number(
          item?.servings
        ) || 1;

      return (
        total +
        Number(
          nutrition?.perServing
            ?.kcal ??
            nutrition?.kcal ??
            0
        ) *
          servings
      );
    },
    0
  );
}

function getDiaryMacros(
  day
) {
  const dayItems =
    getDiaryForDay(
      day
    );

  const recipesArray =
    Array.isArray(
      recipes
    )
      ? recipes
      : [];

  const productsArray =
    ensureProductsArray(
      products
    );

  return dayItems.reduce(
    (
      total,
      item
    ) => {
      const recipe =
        recipesArray.find(
          (recipeItem) =>
            String(
              recipeItem?.id
            ) ===
            String(
              item?.recipeId
            )
        );

      if (!recipe) {
        return total;
      }

      const nutrition =
        calculateRecipeNutrition(
          recipe,
          productsArray
        );

      const servings =
        Number(
          item?.servings
        ) || 1;

      const macros =
        nutrition?.perServing ||
        nutrition ||
        {};

      return {
        protein:
          total.protein +
          Number(
            macros.protein ||
              0
          ) *
            servings,

        fat:
          total.fat +
          Number(
            macros.fat ||
              0
          ) *
            servings,

        carbs:
          total.carbs +
          Number(
            macros.carbs ||
              0
          ) *
            servings,
      };
    },
    {
      protein: 0,
      fat: 0,
      carbs: 0,
    }
  );
}

  // ============================================================
// ADD DIARY MEAL
// ============================================================
async function addDiaryMeal() {
  if (!diaryRecipeId) {
    return;
  }
  const recipesArray =
    Array.isArray(
      recipes
    )
      ? recipes
      : [];
  const diaryArray =
    Array.isArray(
      diary
    )
      ? diary
      : [];
  const recipe =
    recipesArray.find(
      (item) =>
        String(
          item?.id
        ) ===
        String(
          diaryRecipeId
        )
    );
  if (!recipe) {
    return;
  }
  const newMeal = {
    id:
      `diary-${Date.now()}`,
    day:
      Number(
        diaryDay
      ) || 1,
    meal:
      diaryMeal ||
      "Приём пищи",
    recipeId:
      recipe.id,
    servings:
      1,
    time:
      diaryTime ||
      "",
  };
  const nextDiary = [
    ...diaryArray,
    newMeal,
  ];
  setDiary(
    nextDiary
  );
  await persistEverything({
    diary:
      nextDiary,
  });
  setDiaryRecipeId(
    ""
  );
  setDiaryTime(
    ""
  );
  setEditingDiaryId(
    null
  );
}

  // ============================================================
  // EDIT DIARY MEAL
  // ============================================================

  function startEditDiaryMeal(
    item
  ) {
    if (!item) {
      return;
    }

    setEditingDiaryId(
      item.id
    );

    setDiaryDay(
      Number(
        item.day
      ) || 1
    );

    setDiaryMeal(
      item.meal ||
        "Приём пищи"
    );

    setDiaryRecipeId(
      item.recipeId ||
        ""
    );

    setDiaryTime(
      item.time ||
        ""
    );
  }

  // ============================================================
// UPDATE DIARY MEAL
// ============================================================
async function updateDiaryMeal() {
  if (!editingDiaryId) {
    await addDiaryMeal();
    return;
  }
  const diaryArray =
    Array.isArray(
      diary
    )
      ? diary
      : [];
  const nextDiary =
    diaryArray.map(
      (item) =>
        String(
          item?.id
        ) ===
        String(
          editingDiaryId
        )
          ? {
              ...item,
              day:
                Number(
                  diaryDay
                ) || 1,
              meal:
                diaryMeal ||
                "Приём пищи",
              recipeId:
                diaryRecipeId ||
                item?.recipeId,
              time:
                diaryTime ||
                "",
            }
          : item
    );
  setDiary(
    nextDiary
  );
  await persistEverything({
    diary:
      nextDiary,
  });
  setEditingDiaryId(
    null
  );
  setDiaryRecipeId(
    ""
  );
  setDiaryTime(
    ""
  );
}

  // ============================================================
// DELETE DIARY MEAL
// ============================================================
async function removeDiaryMeal(
  item
) {
  if (!item) {
    return;
  }
  const diaryArray =
    Array.isArray(
      diary
    )
      ? diary
      : [];
  const nextDiary =
    diaryArray.filter(
      (diaryItem) =>
        String(
          diaryItem?.id
        ) !==
        String(
          item?.id
        )
    );
  setDiary(
    nextDiary
  );
  await persistEverything({
    diary:
      nextDiary,
  });
  if (
    String(
      editingDiaryId
    ) ===
    String(
      item?.id
    )
  ) {
    setEditingDiaryId(
      null
    );
  }
}

  // ============================================================
// DIARY DAILY TARGET
// ============================================================
async function saveDiaryTarget(
  day,
  value
) {
  const numericValue =
    Number(value) || 0;
  const currentTargets =
    settings?.diaryTargets &&
    typeof settings.diaryTargets === "object" &&
    !Array.isArray(
      settings.diaryTargets
    )
      ? settings.diaryTargets
      : {};
  const nextTargets = {
    ...currentTargets,
    [String(day)]:
      numericValue,
  };
  setDiaryTarget(
    numericValue
  );
  const nextSettings = {
    ...settings,
    diaryTargets:
      nextTargets,
  };
  setSettings(
    nextSettings
  );
  await persistEverything({
    settings:
      nextSettings,
  });
}
// ============================================================
// FAVORITES PERSIST
// ============================================================
useEffect(() => {
  if (!authChecked) {
    return;
  }
  const timer =
    setTimeout(
      () => {
        saveLocalPaCookData({
          products:
            ensureProductsArray(
              products
            ),
          recipes:
            Array.isArray(
              recipes
            )
              ? recipes
              : [],
          favorites:
            Array.isArray(
              favorites
            )
              ? favorites
              : [],
          diary:
            Array.isArray(
              diary
            )
              ? diary
              : [],
          deletedProducts:
            Array.isArray(
              deletedProducts
            )
              ? deletedProducts
              : [],
          deletedRecipes:
            Array.isArray(
              deletedRecipes
            )
              ? deletedRecipes
              : [],
          profile,
          settings: {
            ...settings,
            diaryTargets:
              settings?.diaryTargets &&
              typeof settings.diaryTargets ===
                "object" &&
              !Array.isArray(
                settings.diaryTargets
              )
                ? settings.diaryTargets
                : {},
          },
        }).catch(
          (error) =>
            console.log(
              "Favorite/local persistence error:",
              error
            )
        );
      },
      250
    );
  return () =>
    clearTimeout(
      timer
    );
}, [
  favorites,
  diary,
  diaryTarget,
  authChecked,
  products,
  recipes,
  deletedProducts,
  deletedRecipes,
  profile,
  settings,
]);

  // ============================================================
  // AUTHOR ACCESS
  // ============================================================

  function enterAuthorMode() {
    if (authorUnlocked) {
      setAuthorMode(true);
      setScreen("author");
      return;
    }

    if (!authUser) {
      setScreen("auth");
      return;
    }

    setAuthorMode(true);
    setAuthorUnlocked(true);
    setScreen("author");
  }

  function leaveAuthorMode() {
    setAuthorMode(false);
    setScreen("profile");
  }

  // ============================================================
// RESET LOCAL DATA
// ============================================================
async function resetLocalData() {
  const confirmed =
    await confirmDelete(
      "Сбросить локальные данные PaCook? Авторские изменения, избранное и дневник на этом устройстве будут удалены."
    );
  if (!confirmed) {
    return;
  }
  try {
    await AsyncStorage.removeItem(
      STORAGE_KEYS.data
    );
  } catch (error) {
    console.log(
      "Reset local data error:",
      error
    );
  }
  setProducts([
    ...ALL_INITIAL_PRODUCTS,
  ]);
  setRecipes([
    ...INITIAL_RECIPES,
  ]);
  setFavorites(
    []
  );
  setDiary(
    []
  );
  setDeletedProducts(
    []
  );
  setDeletedRecipes(
    []
  );
  const resetProfile = {
    name:
      authUser?.user_metadata
        ?.name ||
      "PaCook User",
    username: "",
    bio: "",
    avatar: "",
    photo: "",
    city: "",
  };
  setProfile(
    resetProfile
  );
  setProfileForm(
    resetProfile
  );
  const resetSettings = {
    ...DEFAULT_SETTINGS,
    diaryTargets: {},
  };
  setSettings(
    resetSettings
  );
  setDiaryTarget(
    "2000"
  );
  setEditingProductName(
    null
  );
  setEditingRecipeId(
    null
  );
  setEditingDiaryId(
    null
  );
  setScreen(
    "home"
  );
}

  // ============================================================
// ADD INGREDIENT TO RECIPE FORM
// ============================================================
function addRecipeIngredient() {
  const productsArray =
    ensureProductsArray(
      products
    );
  const firstProduct =
    productsArray[0] ||
    null;
  setRecipeForm(
    (current) => ({
      ...current,
      ingredients: [
        ...(Array.isArray(
          current.ingredients
        )
          ? current.ingredients
          : []),
        {
          product:
            firstProduct?.name ||
            "",
          productId:
            firstProduct?.id ||
            "",
          product_id:
            firstProduct?.id ||
            "",
          grams: 100,
          amount: 100,
        },
      ],
    })
  );
}
// ============================================================
// UPDATE RECIPE INGREDIENT
// ============================================================
function updateRecipeIngredient(
  index,
  field,
  value
) {
  setRecipeForm(
    (current) => {
      const ingredients =
        Array.isArray(
          current.ingredients
        )
          ? [
              ...current.ingredients,
            ]
          : [];
      const old =
        ingredients[index] ||
        {
          product: "",
          productId: "",
          product_id: "",
          grams: 0,
          amount: 0,
        };
      let nextValue =
        value;
      if (
        field === "grams" ||
        field === "amount"
      ) {
        nextValue =
          Number(
            value
          ) || 0;
      }
      const updated = {
        ...old,
        [field]:
          nextValue,
      };
      // Если меняется ID продукта,
      // автоматически сохраняем и его название.
      if (
        field === "productId" ||
        field === "product_id"
      ) {
        const productsArray =
          ensureProductsArray(
            products
          );
        const selectedProduct =
          productsArray.find(
            (product) =>
              String(
                product?.id
              ) ===
              String(
                nextValue
              )
          );
        if (selectedProduct) {
          updated.product =
            selectedProduct.name;
          updated.productId =
            selectedProduct.id;
          updated.product_id =
            selectedProduct.id;
        }
      }
      // Если меняется название продукта,
      // пытаемся найти соответствующий продукт.
      if (
        field === "product"
      ) {
        const productsArray =
          ensureProductsArray(
            products
          );
        const selectedProduct =
          productsArray.find(
            (product) =>
              String(
                product?.name
              ) ===
              String(
                nextValue
              )
          );
        if (selectedProduct) {
          updated.product =
            selectedProduct.name;
          updated.productId =
            selectedProduct.id;
          updated.product_id =
            selectedProduct.id;
        }
      }
      if (
        field === "grams"
      ) {
        updated.amount =
          nextValue;
      }
      if (
        field === "amount"
      ) {
        updated.grams =
          nextValue;
      }
      ingredients[index] =
        updated;
      return {
        ...current,
        ingredients,
      };
    }
  );
}

  // ============================================================
  // REMOVE RECIPE INGREDIENT
  // ============================================================

  function removeRecipeIngredient(
    index
  ) {
    setRecipeForm(
      (current) => ({
        ...current,

        ingredients:
          (
            Array.isArray(
              current.ingredients
            )
              ? current.ingredients
              : []
          ).filter(
            (_, itemIndex) =>
              itemIndex !== index
          ),
      })
    );
  }

  // ============================================================
  // ADD RECIPE STEP
  // ============================================================

  function addRecipeStep() {
    setRecipeForm(
      (current) => ({
        ...current,

        steps: [
          ...(Array.isArray(
            current.steps
          )
            ? current.steps
            : []),

          "",
        ],
      })
    );
  }

  // ============================================================
  // UPDATE RECIPE STEP
  // ============================================================

  function updateRecipeStep(
    index,
    value
  ) {
    setRecipeForm(
      (current) => {
        const steps =
          Array.isArray(
            current.steps
          )
            ? [
                ...current.steps,
              ]
            : [];

        steps[index] =
          value;

        return {
          ...current,
          steps,
        };
      }
    );
  }

  // ============================================================
  // REMOVE RECIPE STEP
  // ============================================================

  function removeRecipeStep(
    index
  ) {
    setRecipeForm(
      (current) => ({
        ...current,

        steps:
          (
            Array.isArray(
              current.steps
            )
              ? current.steps
              : []
          ).filter(
            (_, itemIndex) =>
              itemIndex !== index
          ),
      })
    );
  }

  // ============================================================
// RECIPE NUTRITION PREVIEW FOR AUTHOR
// ============================================================
const recipeFormNutrition =
  useMemo(() => {
    const draft = {
      id: "draft",
      title:
        recipeForm.title ||
        "Новый рецепт",
      ingredients:
        Array.isArray(
          recipeForm.ingredients
        )
          ? recipeForm.ingredients
          : [],
    };
    const productsArray =
      ensureProductsArray(
        products
      );
    return calculateRecipeNutrition(
      draft,
      productsArray
    );
  }, [
    recipeForm.ingredients,
    recipeForm.title,
    products,
  ]);
// ============================================================
// CURRENT DAY DIARY DATA
// ============================================================
const currentDayDiary =
  useMemo(
    () =>
      getDiaryForDay(
        diaryDay
      ),
    [
      diary,
      diaryDay,
    ]
  );
const currentDayCalories =
  useMemo(
    () =>
      getDiaryCalories(
        diaryDay
      ),
    [
      diary,
      diaryDay,
      recipes,
      products,
    ]
  );
const currentDayMacros =
  useMemo(
    () =>
      getDiaryMacros(
        diaryDay
      ),
    [
      diary,
      diaryDay,
      recipes,
      products,
    ]
  );
// ============================================================
// AUTHOR COUNTERS
// ============================================================
const customProductsCount =
  useMemo(() => {
    const productsArray =
      ensureProductsArray(
        products
      );
    return productsArray.filter(
      (item) =>
        Boolean(
          item?.custom ||
          item?.author_id
        )
    ).length;
  }, [
    products,
  ]);
const customRecipesCount =
  useMemo(() => {
    const recipesArray =
      Array.isArray(
        recipes
      )
        ? recipes
        : [];
    return recipesArray.filter(
      (item) =>
        Boolean(
          item?.custom ||
          item?.author_id
        )
    ).length;
  }, [
    recipes,
  ]);

  // ============================================================
  // APP READY
  // ============================================================

  const appReady =
    authChecked &&
    !loadingData;

  if (!appReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor:
            COLORS.bg,
          alignItems:
            "center",
          justifyContent:
            "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 34,
            fontWeight: "800",
            color:
              COLORS.green,
            marginBottom: 10,
          }}
        >
          PaCook
        </Text>

        <Text
          style={{
            color:
              COLORS.muted,
            fontSize: 15,
            textAlign:
              "center",
          }}
        >
          Загружаем рецепты и
          продукты…
        </Text>
      </View>
    );
  }
  // ============================================================
// MAIN APP SCREENS
// ============================================================
function renderHomeScreen() {
  const recipesArray =
    Array.isArray(recipes)
      ? recipes
      : [];
  const productsArray =
    ensureProductsArray(
      products
    );
  const favoritesArray =
    Array.isArray(favorites)
      ? favorites
      : [];
  const popularRecipes =
    recipesArray.slice(0, 6);
  const favoriteRecipes =
    recipesArray
      .filter(
        (recipe) =>
          isFavorite(
            recipe.id
          )
      )
      .slice(0, 4);
  const todayCalories =
    getDiaryCalories(
      diaryDay
    );
  const todayTarget =
    Number(
      settings?.diaryTargets?.[
        String(diaryDay)
      ]
    ) || 0;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <AppHeader
        title="PaCook"
        subtitle="Cook smart. Eat better."
        onProfilePress={
          goProfile
        }
      />
      <View
        style={
          styles.heroCard
        }
      >
        <View
          style={
            styles.heroTextWrap
          }
        >
          <Text
            style={
              styles.heroTitle
            }
          >
            Готовь вкусно.
          </Text>
          <Text
            style={
              styles.heroTitle
            }
          >
            Ешь лучше.
          </Text>
          <Text
            style={
              styles.heroSubtitle
            }
          >
            Рецепты, продукты и
            КБЖУ — всё в одном
            месте.
          </Text>
          <PrimaryButton
            title="Смотреть рецепты"
            onPress={
              goRecipes
            }
          />
        </View>
        <View
          style={
            styles.heroEmoji
          }
        >
          <Text
            style={{
              fontSize: 58,
            }}
          >
            🍳
          </Text>
        </View>
      </View>
      <View
        style={
          styles.quickGrid
        }
      >
        <Pressable
          style={
            styles.quickCard
          }
          onPress={
            goRecipes
          }
        >
          <Text
            style={
              styles.quickEmoji
            }
          >
            🍽️
          </Text>
          <Text
            style={
              styles.quickTitle
            }
          >
            Рецепты
          </Text>
          <Text
            style={
              styles.quickValue
            }
          >
            {recipesArray.length}
          </Text>
        </Pressable>
        <Pressable
          style={
            styles.quickCard
          }
          onPress={
            goProducts
          }
        >
          <Text
            style={
              styles.quickEmoji
            }
          >
            🥕
          </Text>
          <Text
            style={
              styles.quickTitle
            }
          >
            Продукты
          </Text>
          <Text
            style={
              styles.quickValue
            }
          >
            {productsArray.length}
          </Text>
        </Pressable>
        <Pressable
          style={
            styles.quickCard
          }
          onPress={
            goFavorites
          }
        >
          <Text
            style={
              styles.quickEmoji
            }
          >
            ❤️
          </Text>
          <Text
            style={
              styles.quickTitle
            }
          >
            Избранное
          </Text>
          <Text
            style={
              styles.quickValue
            }
          >
            {favoritesArray.length}
          </Text>
        </Pressable>
        <Pressable
          style={
            styles.quickCard
          }
          onPress={
            goDiary
          }
        >
          <Text
            style={
              styles.quickEmoji
            }
          >
            📅
          </Text>
          <Text
            style={
              styles.quickTitle
            }
          >
            Дневник
          </Text>
          <Text
            style={
              styles.quickValue
            }
          >
            {Math.round(
              todayCalories
            )}{" "}
            ккал
          </Text>
        </Pressable>
      </View>
      {todayTarget > 0 && (
        <View
          style={
            styles.dailySummaryCard
          }
        >
          <View
            style={
              styles.rowBetween
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              Сегодня
            </Text>
            <Text
              style={
                styles.mutedText
              }
            >
              {Math.round(
                todayCalories
              )}{" "}
              /{" "}
              {Math.round(
                todayTarget
              )} ккал
            </Text>
          </View>
          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      (todayCalories /
                        todayTarget) *
                        100
                    )
                  )}%`,
                },
              ]}
            />
          </View>
          <Text
            style={
              styles.smallMuted
            }
          >
            Осталось примерно{" "}
            {Math.max(
              0,
              Math.round(
                todayTarget -
                  todayCalories
              )
            )}{" "}
            ккал
          </Text>
        </View>
      )}
      <SectionTitle
        title="Популярные рецепты"
        action="Все"
        onAction={
          goRecipes
        }
      />
      {popularRecipes.length >
      0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingRight: 20,
          }}
        >
          {popularRecipes.map(
            (recipe) => (
              <RecipeCard
                key={
                  recipe.id
                }
                recipe={
                  recipe
                }
                nutrition={
                  calculateRecipeNutrition(
                    recipe,
                    productsArray
                  )
                }
                favorite={isFavorite(
                  recipe.id
                )}
                onPress={() =>
                  openRecipe(
                    recipe.id
                  )
                }
                onFavorite={() =>
                  toggleFavorite(
                    recipe.id
                  )
                }
                compact
              />
            )
          )}
        </ScrollView>
      ) : (
        <EmptyState
          title="Пока нет рецептов"
          text="Добавь первый рецепт в авторском режиме."
        />
      )}
      <SectionTitle
        title="Твои избранные"
        action={
          favoriteRecipes.length
            ? "Все"
            : null
        }
        onAction={
          goFavorites
        }
      />
      {favoriteRecipes.length >
      0 ? (
        favoriteRecipes.map(
          (recipe) => (
            <RecipeCard
              key={
                recipe.id
              }
              recipe={
                recipe
              }
              nutrition={
                calculateRecipeNutrition(
                  recipe,
                  productsArray
                )
              }
              favorite
              onPress={() =>
                openRecipe(
                  recipe.id
                )
              }
              onFavorite={() =>
                toggleFavorite(
                  recipe.id
                )
              }
            />
          )
        )
      ) : (
        <EmptyState
          title="Избранное пусто"
          text="Нажми ❤️ на любом рецепте, чтобы сохранить его."
          button="Найти рецепт"
          onPress={
            goRecipes
          }
        />
      )}
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// RECIPES SCREEN
// ============================================================
function renderRecipesScreen() {
  const recipesArray =
    Array.isArray(recipes)
      ? recipes
      : [];
  const filteredRecipesArray =
    Array.isArray(filteredRecipes)
      ? filteredRecipes
      : [];
  const productsArray =
    ensureProductsArray(
      products
    );
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <AppHeader
        title="Рецепты"
        subtitle={`${recipesArray.length} рецептов`}
        onProfilePress={
          goProfile
        }
      />
      <SearchBar
        value={search}
        onChangeText={
          setSearch
        }
        placeholder="Поиск рецепта..."
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.categoryScroll
        }
      >
        {[
          "Все",
          ...categories,
        ].map(
          (category) => {
            const active =
              recipeCategory ===
              category;
            return (
              <Pressable
                key={
                  category
                }
                onPress={() =>
                  setRecipeCategory(
                    category
                  )
                }
                style={[
                  styles.categoryPill,
                  active &&
                    styles.categoryPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    active &&
                      styles.categoryPillTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          }
        )}
      </ScrollView>
      <View
        style={
          styles.resultCountRow
        }
      >
        <Text
          style={
            styles.resultCount
          }
        >
          {filteredRecipesArray.length}{" "}
          рецептов
        </Text>
      </View>
      {filteredRecipesArray.length >
      0 ? (
        filteredRecipesArray.map(
          (recipe) => (
            <RecipeCard
              key={
                recipe.id
              }
              recipe={
                recipe
              }
              nutrition={
                calculateRecipeNutrition(
                  recipe,
                  productsArray
                )
              }
              favorite={isFavorite(
                recipe.id
              )}
              onPress={() =>
                openRecipe(
                  recipe.id
                )
              }
              onFavorite={() =>
                toggleFavorite(
                  recipe.id
                )
              }
            />
          )
        )
      ) : (
        <EmptyState
          title="Ничего не найдено"
          text="Попробуй изменить поисковый запрос или категорию."
          button="Сбросить"
          onPress={() => {
            setSearch("");
            setRecipeCategory(
              "Все"
            );
          }}
        />
      )}
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// RECIPE DETAIL SCREEN
// ============================================================
function renderRecipeScreen() {
  const recipe =
    selectedRecipe;
  if (!recipe) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <Text
          style={
            styles.emptyTitle
          }
        >
          Рецепт не найден
        </Text>
        <PrimaryButton
          title="Назад"
          onPress={
            goRecipes
          }
        />
      </View>
    );
  }
  const productsArray =
    ensureProductsArray(
      products
    );
  const nutrition =
    calculateRecipeNutrition(
      recipe,
      productsArray
    );
  const ingredients =
    Array.isArray(
      recipe.ingredients
    )
      ? recipe.ingredients
      : [];
  const steps =
    Array.isArray(
      recipe.steps
    )
      ? recipe.steps
      : [];
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <View
        style={
          styles.detailTopBar
        }
      >
        <Pressable
          onPress={
            closeRecipe
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </Pressable>
        <Text
          style={
            styles.detailTopTitle
          }
        >
          Рецепт
        </Text>
        <Pressable
          onPress={() =>
            toggleFavorite(
              recipe.id
            )
          }
          style={
            styles.favoriteTopButton
          }
        >
          <Text
            style={{
              fontSize: 22,
            }}
          >
            {isFavorite(
              recipe.id
            )
              ? "❤️"
              : "♡"}
          </Text>
        </Pressable>
      </View>
      <ImageWithFallback
        uri={
          recipe.image ||
          recipe.image_url
        }
        style={
          styles.recipeHeroImage
        }
        fallback="🍽️"
      />
      <View
        style={
          styles.recipeDetailCard
        }
      >
        <View
          style={
            styles.rowBetween
          }
        >
          <Pill
            text={
              recipe.category ||
              "Другое"
            }
          />
          {recipe.pro && (
            <Pill
              text="PRO"
              green
            />
          )}
        </View>
        <Text
          style={
            styles.detailRecipeTitle
          }
        >
          {recipe.title ||
            recipe.name}
        </Text>
        {!!recipe.description && (
          <Text
            style={
              styles.detailDescription
            }
          >
            {
              recipe.description
            }
          </Text>
        )}
        <View
          style={
            styles.nutritionGrid
          }
        >
          <StatCard
            label="Ккал"
            value={`${Math.round(
              nutrition.kcal
            )}`}
          />
          <StatCard
            label="Белки"
            value={`${Math.round(
              nutrition.protein
            )} г`}
          />
          <StatCard
            label="Жиры"
            value={`${Math.round(
              nutrition.fat
            )} г`}
          />
          <StatCard
            label="Углеводы"
            value={`${Math.round(
              nutrition.carbs
            )} г`}
          />
        </View>
        <View
          style={
            styles.recipeMetaRow
          }
        >
          {recipe.servings ? (
            <Text
              style={
                styles.recipeMeta
              }
            >
              👥{" "}
              {recipe.servings}{" "}
              порц.
            </Text>
          ) : null}
          {recipe.prepTime ? (
            <Text
              style={
                styles.recipeMeta
              }
            >
              ⏱️{" "}
              {recipe.prepTime} мин
            </Text>
          ) : null}
          {recipe.cookTime ? (
            <Text
              style={
                styles.recipeMeta
              }
            >
              🔥{" "}
              {recipe.cookTime} мин
            </Text>
          ) : null}
        </View>
      </View>
      <SectionTitle
        title="Ингредиенты"
      />
      <View
        style={
          styles.ingredientsCard
        }
      >
        {ingredients.length >
        0 ? (
          ingredients.map(
            (
              ingredient,
              index
            ) => {
              const product =
                productsArray.find(
                  (item) =>
                    String(
                      item?.id
                    ) ===
                    String(
                      ingredient?.productId ||
                        ingredient?.product_id
                    )
                );
              const grams =
                Number(
                  ingredient?.grams ??
                    ingredient?.amount ??
                    ingredient?.weight ??
                    0
                );
              return (
                <View
                  key={`${recipe.id}-ingredient-${index}`}
                  style={
                    styles.ingredientRow
                  }
                >
                  <View
                    style={
                      styles.ingredientBullet
                    }
                  />
                  <Text
                    style={
                      styles.ingredientName
                    }
                  >
                    {product?.name ||
                      ingredient?.product ||
                      ingredient?.name ||
                      "Продукт"}
                  </Text>
                  <Text
                    style={
                      styles.ingredientAmount
                    }
                  >
                    {grams} г
                  </Text>
                </View>
              );
            }
          )
        ) : (
          <Text
            style={
              styles.mutedText
            }
          >
            Ингредиенты пока не
            указаны.
          </Text>
        )}
      </View>
      <SectionTitle
        title="Приготовление"
      />
      <View
        style={
          styles.stepsCard
        }
      >
        {steps.length >
        0 ? (
          steps.map(
            (
              step,
              index
            ) => (
              <View
                key={`${recipe.id}-step-${index}`}
                style={
                  styles.stepRow
                }
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
                    {index +
                      1}
                  </Text>
                </View>
                <Text
                  style={
                    styles.stepText
                  }
                >
                  {step}
                </Text>
              </View>
            )
          )
        ) : (
          <Text
            style={
              styles.mutedText
            }
          >
            Шаги приготовления
            пока не указаны.
          </Text>
        )}
      </View>
      <View
        style={
          styles.recipeNutritionNote
        }
      >
        <Text
          style={
            styles.recipeNutritionNoteTitle
          }
        >
          📊 Расчёт КБЖУ
        </Text>
        <Text
          style={
            styles.recipeNutritionNoteText
          }
        >
          Значения рассчитаны
          по количеству
          ингредиентов в рецепте.
          Если продукты указаны
          в сыром виде, расчёт
          производится по сырому
          весу.
        </Text>
      </View>
      <PrimaryButton
        title="Добавить в дневник"
        onPress={() => {
          setDiaryRecipeId(
            recipe.id
          );
          setDiaryDay(1);
          setScreen(
            "diary"
          );
        }}
      />
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// PRODUCTS SCREEN
// ============================================================
function renderProductsScreen() {
  const productsArray =
    ensureProductsArray(
      products
    );
  const filteredProductsArray =
    Array.isArray(
      filteredProducts
    )
      ? filteredProducts
      : [];
  const grouped =
    filteredProductsArray.reduce(
      (
        result,
        product
      ) => {
        if (!product) {
          return result;
        }
        const category =
          cleanString(
            product.category
          ) || "Другое";
        if (!result[category]) {
          result[category] = [];
        }
        result[category].push(
          product
        );
        return result;
      },
      {}
    );
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <AppHeader
        title="Продукты"
        subtitle={`${productsArray.length} продуктов`}
        onProfilePress={
          goProfile
        }
      />
      <SearchBar
        value={
          productsSearch
        }
        onChangeText={
          setProductsSearch
        }
        placeholder="Найти продукт..."
      />
      <View
        style={
          styles.productInfoCard
        }
      >
        <Text
          style={
            styles.productInfoTitle
          }
        >
          КБЖУ на 100 г
        </Text>
        <Text
          style={
            styles.productInfoText
          }
        >
          Выбирай продукты с
          понятной пищевой
          ценностью и используй
          их в своих рецептах.
        </Text>
      </View>
      {Object.keys(
        grouped
      ).map(
        (category) => (
          <View
            key={
              category
            }
          >
            <SectionTitle
              title={
                category
              }
            />
            {grouped[
              category
            ].map(
              (product) => (
                <View
                  key={
                    product.id ||
                    product.name
                  }
                  style={
                    styles.productCard
                  }
                >
                  <View
                    style={
                      styles.productIcon
                    }
                  >
                    <Text
                      style={{
                        fontSize: 25,
                      }}
                    >
                      {getProductEmoji(
                        product
                      )}
                    </Text>
                  </View>
                  <View
                    style={
                      styles.productMain
                    }
                  >
                    <Text
                      style={
                        styles.productName
                      }
                    >
                      {
                        product.name
                      }
                    </Text>
                    <Text
                      style={
                        styles.productKcal
                      }
                    >
                      {Math.round(
                        Number(
                          product.kcal
                        ) || 0
                      )}{" "}
                      ккал / 100 г
                    </Text>
                    <View
                      style={
                        styles.productMacros
                      }
                    >
                      <Text
                        style={
                          styles.productMacroText
                        }
                      >
                        Б{" "}
                        {Number(
                          product.protein
                        ) || 0}
                      </Text>
                      <Text
                        style={
                          styles.productMacroText
                        }
                      >
                        Ж{" "}
                        {Number(
                          product.fat
                        ) || 0}
                      </Text>
                      <Text
                        style={
                          styles.productMacroText
                        }
                      >
                        У{" "}
                        {Number(
                          product.carbs
                        ) || 0}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            )}
          </View>
        )
      )}
      {filteredProductsArray.length ===
        0 && (
        <EmptyState
          title="Продукт не найден"
          text="Попробуй другое название."
          button="Очистить поиск"
          onPress={() =>
            setProductsSearch(
              ""
            )
          }
        />
      )}
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// FAVORITES SCREEN
// ============================================================
function renderFavoritesScreen() {
  const recipesArray =
    Array.isArray(recipes)
      ? recipes
      : [];
  const productsArray =
    ensureProductsArray(
      products
    );
  const favoriteRecipes =
    recipesArray.filter(
      (recipe) =>
        isFavorite(
          recipe.id
        )
    );
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <AppHeader
        title="Избранное"
        subtitle={
          favoriteRecipes.length
            ? `${favoriteRecipes.length} сохранено`
            : "Сохрани понравившиеся рецепты"
        }
        onProfilePress={
          goProfile
        }
      />
      {favoriteRecipes.length >
      0 ? (
        favoriteRecipes.map(
          (recipe) => (
            <RecipeCard
              key={
                recipe.id
              }
              recipe={
                recipe
              }
              nutrition={
                calculateRecipeNutrition(
                  recipe,
                  productsArray
                )
              }
              favorite
              onPress={() =>
                openRecipe(
                  recipe.id
                )
              }
              onFavorite={() =>
                toggleFavorite(
                  recipe.id
                )
              }
            />
          )
        )
      ) : (
        <EmptyState
          title="Здесь пока пусто"
          text="Нажимай на сердечко ❤️, чтобы сохранять рецепты."
          button="Открыть рецепты"
          onPress={
            goRecipes
          }
        />
      )}
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}
// ============================================================
// DIARY SCREEN
// ============================================================
function renderDiaryScreen() {
  const days = [
    {
      id: 1,
      label: "Пн",
    },
    {
      id: 2,
      label: "Вт",
    },
    {
      id: 3,
      label: "Ср",
    },
    {
      id: 4,
      label: "Чт",
    },
    {
      id: 5,
      label: "Пт",
    },
    {
      id: 6,
      label: "Сб",
    },
    {
      id: 7,
      label: "Вс",
    },
  ];
  const recipesArray =
    Array.isArray(recipes)
      ? recipes
      : [];
  const productsArray =
    ensureProductsArray(
      products
    );
  const currentDiaryArray =
    Array.isArray(
      currentDayDiary
    )
      ? currentDayDiary
      : [];
  const target =
    Number(
      settings?.diaryTargets?.[
        String(diaryDay)
      ]
    ) || 0;
  const mealLabels = [
    "Завтрак",
    "Обед",
    "Ужин",
    "Перекус",
  ];
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <AppHeader
        title="Дневник"
        subtitle="Твой план питания"
        onProfilePress={
          goProfile
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingRight: 20,
        }}
      >
        {days.map(
          (day) => {
            const active =
              Number(
                diaryDay
              ) ===
              Number(
                day.id
              );
            return (
              <Pressable
                key={
                  day.id
                }
                onPress={() =>
                  setDiaryDay(
                    day.id
                  )
                }
                style={[
                  styles.dayPill,
                  active &&
                    styles.dayPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayPillText,
                    active &&
                      styles.dayPillTextActive,
                  ]}
                >
                  {
                    day.label
                  }
                </Text>
              </Pressable>
            );
          }
        )}
      </ScrollView>
      <View
        style={
          styles.diarySummaryCard
        }
      >
        <Text
          style={
            styles.diarySummaryTitle
          }
        >
          Цель на день
        </Text>
        <View
          style={
            styles.diaryCaloriesRow
          }
        >
          <Text
            style={
              styles.diaryCalories
            }
          >
            {Math.round(
              currentDayCalories
            )}
          </Text>
          <Text
            style={
              styles.diaryCaloriesUnit
            }
          >
            / {target || "—"} ккал
          </Text>
        </View>
        <View
          style={
            styles.progressTrack
          }
        >
          <View
            style={[
              styles.progressFill,
              {
                width:
                  target > 0
                    ? `${Math.min(
                        100,
                        Math.max(
                          0,
                          (currentDayCalories /
                            target) *
                            100
                        )
                      )}%`
                    : "0%",
              },
            ]}
          />
        </View>
        <View
          style={
            styles.diaryMacroGrid
          }
        >
          <MacroRow
            label="Белки"
            value={`${Math.round(
              currentDayMacros?.protein ||
                0
            )} г`}
          />
          <MacroRow
            label="Жиры"
            value={`${Math.round(
              currentDayMacros?.fat ||
                0
            )} г`}
          />
          <MacroRow
            label="Углеводы"
            value={`${Math.round(
              currentDayMacros?.carbs ||
                0
            )} г`}
          />
        </View>
        <FormInput
          label="Калорийная цель"
          value={
            target
              ? String(target)
              : ""
          }
          onChangeText={(
            value
          ) =>
            saveDiaryTarget(
              diaryDay,
              value
            )
          }
          keyboardType="numeric"
          placeholder="Например, 2200"
        />
      </View>
      <SectionTitle
        title={`Питание — ${
          days.find(
            (day) =>
              day.id ===
              Number(
                diaryDay
              )
          )?.label ||
          ""
        }`}
      />
      {currentDiaryArray.length >
      0 ? (
        currentDiaryArray.map(
          (item) => {
            const recipe =
              recipesArray.find(
                (recipeItem) =>
                  String(
                    recipeItem?.id
                  ) ===
                  String(
                    item?.recipeId
                  )
              );
            const nutrition =
              recipe
                ? calculateRecipeNutrition(
                    recipe,
                    productsArray
                  )
                : null;
            return (
              <View
                key={
                  item.id
                }
                style={
                  styles.diaryMealCard
                }
              >
                <View
                  style={
                    styles.diaryMealIcon
                  }
                >
                  <Text
                    style={{
                      fontSize: 24,
                    }}
                  >
                    {item.meal ===
                    "Завтрак"
                      ? "☀️"
                      : item.meal ===
                        "Обед"
                      ? "🍲"
                      : item.meal ===
                        "Ужин"
                      ? "🌙"
                      : "🍎"}
                  </Text>
                </View>
                <View
                  style={
                    styles.diaryMealMain
                  }
                >
                  <Text
                    style={
                      styles.diaryMealType
                    }
                  >
                    {
                      item.meal
                    }
                    {item.time
                      ? ` · ${item.time}`
                      : ""}
                  </Text>
                  <Text
                    style={
                      styles.diaryMealName
                    }
                  >
                    {recipe?.title ||
                      recipe?.name ||
                      "Рецепт удалён"}
                  </Text>
                  {nutrition && (
                    <Text
                      style={
                        styles.diaryMealKcal
                      }
                    >
                      {Math.round(
                        nutrition?.perServing
                          ?.kcal ??
                          nutrition?.kcal ??
                          0
                      )}{" "}
                      ккал
                    </Text>
                  )}
                </View>
                <View
                  style={
                    styles.diaryMealActions
                  }
                >
                  <Pressable
                    onPress={() =>
                      startEditDiaryMeal(
                        item
                      )
                    }
                    style={
                      styles.iconButton
                    }
                  >
                    <Text>
                      ✏️
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      removeDiaryMeal(
                        item
                      )
                    }
                    style={
                      styles.iconButton
                    }
                  >
                    <Text>
                      🗑️
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }
        )
      ) : (
        <EmptyState
          title="Нет приёмов пищи"
          text="Добавь рецепт в план на этот день."
        />
      )}
      <SectionTitle
        title={
          editingDiaryId
            ? "Изменить приём пищи"
            : "Добавить приём пищи"
        }
      />
      <View
        style={
          styles.formCard
        }
      >
        <Text
          style={
            styles.formLabel
          }
        >
          Приём пищи
        </Text>
        <View
          style={
            styles.mealTypeGrid
          }
        >
          {mealLabels.map(
            (meal) => (
              <Pressable
                key={
                  meal
                }
                onPress={() =>
                  setDiaryMeal(
                    meal
                  )
                }
                style={[
                  styles.mealTypeButton,
                  diaryMeal ===
                    meal &&
                    styles.mealTypeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    diaryMeal ===
                      meal &&
                      styles.mealTypeTextActive,
                  ]}
                >
                  {meal}
                </Text>
              </Pressable>
            )
          )}
        </View>
        <FormInput
          label="Время"
          value={
            diaryTime
          }
          onChangeText={
            setDiaryTime
          }
          placeholder="Например, 08:30"
        />
        <Text
          style={
            styles.formLabel
          }
        >
          Рецепт
        </Text>
        <View
          style={
            styles.recipeSelectBox
          }
        >
          <ScrollView
            style={{
              maxHeight: 220,
            }}
            nestedScrollEnabled
          >
            {recipesArray.map(
              (recipe) => {
                const active =
                  String(
                    diaryRecipeId
                  ) ===
                  String(
                    recipe.id
                  );
                return (
                  <Pressable
                    key={
                      recipe.id
                    }
                    onPress={() =>
                      setDiaryRecipeId(
                        recipe.id
                      )
                    }
                    style={[
                      styles.recipeSelectItem,
                      active &&
                        styles.recipeSelectItemActive,
                    ]}
                  >
                    <Text
                      style={
                        styles.recipeSelectEmoji
                      }
                    >
                      🍽️
                    </Text>
                    <Text
                      style={[
                        styles.recipeSelectText,
                        active &&
                          styles.recipeSelectTextActive,
                      ]}
                      numberOfLines={
                        1
                      }
                    >
                      {
                        recipe.title ||
                        recipe.name
                      }
                    </Text>
                    {active && (
                      <Text>
                        ✓
                      </Text>
                    )}
                  </Pressable>
                );
              }
            )}
          </ScrollView>
        </View>
        <PrimaryButton
          title={
            editingDiaryId
              ? "Сохранить изменения"
              : "Добавить в дневник"
          }
          onPress={
            editingDiaryId
              ? updateDiaryMeal
              : addDiaryMeal
          }
        />
        {editingDiaryId && (
          <SecondaryButton
            title="Отмена"
            onPress={() => {
              setEditingDiaryId(
                null
              );
              setDiaryRecipeId(
                ""
              );
              setDiaryTime(
                ""
              );
            }}
          />
        )}
      </View>
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// SCREEN SWITCH
// ============================================================
if (screen === "home") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderHomeScreen()}
      {renderBottomNavigation()}
    </View>
  );
}
if (screen === "recipes") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderRecipesScreen()}
      {renderBottomNavigation()}
    </View>
  );
}
if (screen === "recipe") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderRecipeScreen()}
      {renderBottomNavigation()}
    </View>
  );
}
if (screen === "products") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderProductsScreen()}
      {renderBottomNavigation()}
    </View>
  );
}
if (screen === "favorites") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderFavoritesScreen()}
      {renderBottomNavigation()}
    </View>
  );
}
if (screen === "diary") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderDiaryScreen()}
      {renderBottomNavigation()}
    </View>
  );
}
// ============================================================
// PROFILE SCREEN
// ============================================================
function renderProfileScreen() {
  const recipesArray =
    Array.isArray(recipes)
      ? recipes
      : [];
  const productsArray =
    ensureProductsArray(
      products
    );
  const favoritesArray =
    Array.isArray(favorites)
      ? favorites
      : [];
  const profileName =
    profile?.name ||
    authUser?.user_metadata?.name ||
    "PaCook User";
  const profileUsername =
    profile?.username || "";
  const profileBio =
    profile?.bio || "";
  const profileAvatar =
    profile?.avatar ||
    profile?.photo ||
    authUser?.user_metadata?.avatar ||
    "";
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <AppHeader
        title="Профиль"
        subtitle="Твой PaCook"
        onProfilePress={
          () => {}
        }
      />
      <View
        style={
          styles.profileHero
        }
      >
        <View
          style={
            styles.profileAvatarLarge
          }
        >
          {profileAvatar ? (
            <ImageWithFallback
              uri={
                profileAvatar
              }
              style={
                styles.profileAvatarImage
              }
              fallback="👨‍🍳"
            />
          ) : (
            <Text
              style={{
                fontSize: 42,
              }}
            >
              👨‍🍳
            </Text>
          )}
        </View>
        <Text
          style={
            styles.profileName
          }
        >
          {profileName}
        </Text>
        {!!profileUsername && (
          <Text
            style={
              styles.profileUsername
            }
          >
            @{profileUsername}
          </Text>
        )}
        <Text
          style={
            styles.profileEmail
          }
        >
          {authUser?.email ||
            "Твой персональный профиль"}
        </Text>
        {!!profileBio && (
          <Text
            style={
              styles.profileBio
            }
          >
            {profileBio}
          </Text>
        )}
        <SecondaryButton
          title="Редактировать профиль"
          onPress={
            startEditProfile
          }
        />
      </View>
      <View
        style={
          styles.profileStats
        }
      >
        <StatCard
          label="Рецепты"
          value={
            recipesArray.length
          }
        />
        <StatCard
          label="Продукты"
          value={
            productsArray.length
          }
        />
        <StatCard
          label="Избранное"
          value={
            favoritesArray.length
          }
        />
      </View>
      <SectionTitle
        title="Мой PaCook"
      />
      <Pressable
        style={
          styles.menuCard
        }
        onPress={
          goDiary
        }
      >
        <View
          style={
            styles.menuIcon
          }
        >
          <Text
            style={{
              fontSize: 22,
            }}
          >
            📅
          </Text>
        </View>
        <View
          style={
            styles.menuMain
          }
        >
          <Text
            style={
              styles.menuTitle
            }
          >
            Дневник питания
          </Text>
          <Text
            style={
              styles.menuSubtitle
            }
          >
            Планируй питание на
            всю неделю
          </Text>
        </View>
        <Text
          style={
            styles.menuArrow
          }
        >
          ›
        </Text>
      </Pressable>
      <Pressable
        style={
          styles.menuCard
        }
        onPress={
          goFavorites
        }
      >
        <View
          style={
            styles.menuIcon
          }
        >
          <Text
            style={{
              fontSize: 22,
            }}
          >
            ❤️
          </Text>
        </View>
        <View
          style={
            styles.menuMain
          }
        >
          <Text
            style={
              styles.menuTitle
            }
          >
            Избранное
          </Text>
          <Text
            style={
              styles.menuSubtitle
            }
          >
            Сохранённые рецепты
          </Text>
        </View>
        <Text
          style={
            styles.menuArrow
          }
        >
          ›
        </Text>
      </Pressable>
      <SectionTitle
        title="Автор"
      />
      <Pressable
        style={
          styles.authorProfileCard
        }
        onPress={
          enterAuthorMode
        }
      >
        <View
          style={
            styles.authorBadge
          }
        >
          <Text
            style={{
              fontSize: 26,
            }}
          >
            ✨
          </Text>
        </View>
        <View
          style={
            styles.menuMain
          }
        >
          <Text
            style={
              styles.menuTitle
            }
          >
            Авторский режим
          </Text>
          <Text
            style={
              styles.menuSubtitle
            }
          >
            {authorUnlocked
              ? "Управление твоими рецептами и продуктами"
              : "Создавай свои рецепты"}
          </Text>
        </View>
        <Text
          style={
            styles.menuArrow
          }
        >
          ›
        </Text>
      </Pressable>
      <SectionTitle
        title="Настройки"
      />
      <Pressable
        style={
          styles.menuCard
        }
        onPress={
          goSettings
        }
      >
        <View
          style={
            styles.menuIcon
          }
        >
          <Text
            style={{
              fontSize: 22,
            }}
          >
            ⚙️
          </Text>
        </View>
        <View
          style={
            styles.menuMain
          }
        >
          <Text
            style={
              styles.menuTitle
            }
          >
            Настройки
          </Text>
          <Text
            style={
              styles.menuSubtitle
            }
          >
            Приложение и данные
          </Text>
        </View>
        <Text
          style={
            styles.menuArrow
          }
        >
          ›
        </Text>
      </Pressable>
      {authUser ? (
        <Pressable
          style={
            styles.logoutButton
          }
          onPress={
            logoutUser
          }
        >
          <Text
            style={
              styles.logoutText
            }
          >
            Выйти из аккаунта
          </Text>
        </Pressable>
      ) : (
        <PrimaryButton
          title="Войти / Регистрация"
          onPress={() =>
            setScreen(
              "auth"
            )
          }
        />
      )}
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// PROFILE EDIT SCREEN
// ============================================================
function renderProfileEditScreen() {
  const safeProfileForm =
    profileForm &&
    typeof profileForm === "object"
      ? profileForm
      : {
          name: "",
          username: "",
          city: "",
          bio: "",
          avatar: "",
        };
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <View
        style={
          styles.simpleTopBar
        }
      >
        <Pressable
          onPress={
            goProfile
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </Pressable>
        <Text
          style={
            styles.simpleTopTitle
          }
        >
          Редактирование
        </Text>
        <View
          style={{
            width: 42,
          }}
        />
      </View>
      <View
        style={
          styles.editProfileAvatar
        }
      >
        {safeProfileForm.avatar ? (
          <ImageWithFallback
            uri={
              safeProfileForm.avatar
            }
            style={
              styles.editProfileAvatarImage
            }
            fallback="👨‍🍳"
          />
        ) : (
          <Text
            style={{
              fontSize: 42,
            }}
          >
            👨‍🍳
          </Text>
        )}
      </View>
      <Text
        style={
          styles.avatarHint
        }
      >
        Фото сохраняется как
        ссылка и не пропадает
        после обновления
        приложения.
      </Text>
      <View
        style={
          styles.formCard
        }
      >
        <FormInput
          label="Имя"
          value={
            safeProfileForm.name || ""
          }
          onChangeText={(
            value
          ) =>
            setProfileForm(
              (current) => ({
                ...(current || {}),
                name: value,
              })
            )
          }
          placeholder="Твоё имя"
        />
        <FormInput
          label="Никнейм"
          value={
            safeProfileForm.username ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setProfileForm(
              (current) => ({
                ...(current || {}),
                username:
                  value.replace(
                    /\s/g,
                    ""
                  ),
              })
            )
          }
          placeholder="username"
          autoCapitalize="none"
        />
        <FormInput
          label="Город"
          value={
            safeProfileForm.city ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setProfileForm(
              (current) => ({
                ...(current || {}),
                city: value,
              })
            )
          }
          placeholder="Например, Алматы"
        />
        <FormInput
          label="О себе"
          value={
            safeProfileForm.bio ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setProfileForm(
              (current) => ({
                ...(current || {}),
                bio: value,
              })
            )
          }
          placeholder="Расскажи немного о себе"
          multiline
        />
        <FormInput
          label="Ссылка на фото"
          value={
            safeProfileForm.avatar ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setProfileForm(
              (current) => ({
                ...(current || {}),
                avatar: value,
              })
            )
          }
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
        />
        <PrimaryButton
          title="Сохранить профиль"
          onPress={
            saveProfile
          }
        />
        <SecondaryButton
          title="Отмена"
          onPress={
            goProfile
          }
        />
      </View>
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}
// ============================================================
// AUTHOR SCREEN
// ============================================================
function renderAuthorScreen() {
  if (!authUser) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <Text
          style={
            styles.emptyEmoji
          }
        >
          🔐
        </Text>
        <Text
          style={
            styles.emptyTitle
          }
        >
          Нужен аккаунт
        </Text>
        <Text
          style={
            styles.emptyText
          }
        >
          Войди в аккаунт, чтобы
          управлять своими
          рецептами и продуктами.
        </Text>
        <PrimaryButton
          title="Войти"
          onPress={() =>
            setScreen(
              "auth"
            )
          }
        />
      </View>
    );
  }
  const recipesArray =
    Array.isArray(recipes)
      ? recipes
      : [];
  const productsArray =
    ensureProductsArray(
      products
    );
  const customRecipes =
    recipesArray.filter(
      (recipe) =>
        Boolean(
          recipe?.custom ||
          recipe?.author_id
        )
    );
  const customProducts =
    productsArray.filter(
      (product) =>
        Boolean(
          product?.custom ||
          product?.author_id
        )
    );
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <View
        style={
          styles.simpleTopBar
        }
      >
        <Pressable
          onPress={
            leaveAuthorMode
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </Pressable>
        <Text
          style={
            styles.simpleTopTitle
          }
        >
          Автор
        </Text>
        <Pressable
          onPress={
            goSettings
          }
          style={
            styles.topIconButton
          }
        >
          <Text>
            ⚙️
          </Text>
        </Pressable>
      </View>
      <View
        style={
          styles.authorHero
        }
      >
        <View
          style={
            styles.authorHeroIcon
          }
        >
          <Text
            style={{
              fontSize: 34,
            }}
          >
            ✨
          </Text>
        </View>
        <Text
          style={
            styles.authorHeroTitle
          }
        >
          Авторский режим
        </Text>
        <Text
          style={
            styles.authorHeroText
          }
        >
          Создавай и редактируй
          собственные продукты и
          рецепты. Изменения
          сохраняются локально и
          синхронизируются с
          аккаунтом.
        </Text>
      </View>
      <View
        style={
          styles.profileStats
        }
      >
        <StatCard
          label="Мои продукты"
          value={
            customProducts.length
          }
        />
        <StatCard
          label="Мои рецепты"
          value={
            customRecipes.length
          }
        />
      </View>
      <SectionTitle
        title="Создать"
      />
      <View
        style={
          styles.authorActionGrid
        }
      >
        <Pressable
          style={
            styles.authorActionCard
          }
          onPress={
            startNewRecipe
          }
        >
          <Text
            style={
              styles.authorActionEmoji
            }
          >
            🍳
          </Text>
          <Text
            style={
              styles.authorActionTitle
            }
          >
            Новый рецепт
          </Text>
          <Text
            style={
              styles.authorActionText
            }
          >
            Добавить рецепт
          </Text>
        </Pressable>
        <Pressable
          style={
            styles.authorActionCard
          }
          onPress={
            startNewProduct
          }
        >
          <Text
            style={
              styles.authorActionEmoji
            }
          >
            🥕
          </Text>
          <Text
            style={
              styles.authorActionTitle
            }
          >
            Новый продукт
          </Text>
          <Text
            style={
              styles.authorActionText
            }
          >
            Добавить продукт
          </Text>
        </Pressable>
      </View>
      <SectionTitle
        title="Мои рецепты"
      />
      {customRecipes.length > 0 ? (
        customRecipes.map(
          (recipe) => (
            <View
              key={
                recipe.id
              }
              style={
                styles.authorListCard
              }
            >
              <ImageWithFallback
                uri={
                  recipe.image ||
                  recipe.image_url
                }
                style={
                  styles.authorListImage
                }
                fallback="🍽️"
              />
              <View
                style={
                  styles.authorListMain
                }
              >
                <Text
                  style={
                    styles.authorListTitle
                  }
                  numberOfLines={
                    2
                  }
                >
                  {recipe.title ||
                    recipe.name ||
                    "Без названия"}
                </Text>
                <Text
                  style={
                    styles.authorListSubtitle
                  }
                >
                  {recipe.category ||
                    "Другое"}
                </Text>
                <Text
                  style={
                    styles.authorListKcal
                  }
                >
                  {Math.round(
                    calculateRecipeNutrition(
                      recipe,
                      productsArray
                    ).kcal
                  )}{" "}
                  ккал
                </Text>
              </View>
              <View
                style={
                  styles.authorListActions
                }
              >
                <Pressable
                  onPress={() =>
                    startEditRecipe(
                      recipe
                    )
                  }
                  style={
                    styles.authorSmallButton
                  }
                >
                  <Text>
                    ✏️
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    removeRecipe(
                      recipe
                    )
                  }
                  style={
                    styles.authorSmallButton
                  }
                >
                  <Text>
                    🗑️
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        )
      ) : (
        <EmptyState
          title="Нет своих рецептов"
          text="Создай первый рецепт."
          button="Создать рецепт"
          onPress={
            startNewRecipe
          }
        />
      )}
      <SectionTitle
        title="Мои продукты"
      />
      {customProducts.length > 0 ? (
        customProducts.map(
          (product) => (
            <View
              key={
                product.id
              }
              style={
                styles.authorProductCard
              }
            >
              <View
                style={
                  styles.authorProductIcon
                }
              >
                <Text
                  style={{
                    fontSize: 24,
                  }}
                >
                  {getProductEmoji(
                    product
                  )}
                </Text>
              </View>
              <View
                style={
                  styles.authorProductMain
                }
              >
                <Text
                  style={
                    styles.authorListTitle
                  }
                >
                  {
                    product.name
                  }
                </Text>
                <Text
                  style={
                    styles.authorListSubtitle
                  }
                >
                  {Math.round(
                    Number(
                      product.kcal
                    ) || 0
                  )}{" "}
                  ккал · Б{" "}
                  {Number(
                    product.protein
                  ) || 0}{" "}
                  · Ж{" "}
                  {Number(
                    product.fat
                  ) || 0}{" "}
                  · У{" "}
                  {Number(
                    product.carbs
                  ) || 0}
                </Text>
              </View>
              <View
                style={
                  styles.authorListActions
                }
              >
                <Pressable
                  onPress={() =>
                    startEditProduct(
                      product
                    )
                  }
                  style={
                    styles.authorSmallButton
                  }
                >
                  <Text>
                    ✏️
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    removeProduct(
                      product
                    )
                  }
                  style={
                    styles.authorSmallButton
                  }
                >
                  <Text>
                    🗑️
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        )
      ) : (
        <EmptyState
          title="Нет своих продуктов"
          text="Добавь продукт для использования в рецептах."
          button="Создать продукт"
          onPress={
            startNewProduct
          }
        />
      )}
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// PRODUCT EDITOR
// ============================================================
function renderAuthorProductScreen() {
  const editing =
    Boolean(editingProductName);
  const safeProductForm =
    productForm &&
    typeof productForm === "object"
      ? productForm
      : {
          name: "",
          category: "Другое",
          kcal: "",
          protein: "",
          fat: "",
          carbs: "",
          fiber: "",
          image: "",
        };
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={
          styles.simpleTopBar
        }
      >
        <Pressable
          onPress={() =>
            setScreen("author")
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </Pressable>
        <Text
          style={
            styles.simpleTopTitle
          }
        >
          {editing
            ? "Изменить продукт"
            : "Новый продукт"}
        </Text>
        <View
          style={{
            width: 42,
          }}
        />
      </View>
      <View
        style={
          styles.formCard
        }
      >
        <FormInput
          label="Название"
          value={
            safeProductForm.name ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setProductForm(
              (current) => ({
                ...(current || {}),
                name: value,
              })
            )
          }
          placeholder="Например, Авокадо"
        />
        <FormInput
          label="Категория"
          value={
            safeProductForm.category ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setProductForm(
              (current) => ({
                ...(current || {}),
                category: value,
              })
            )
          }
          placeholder="Овощи"
        />
        <Text
          style={
            styles.formSectionTitle
          }
        >
          КБЖУ на 100 г
        </Text>
        <FormInput
          label="Калории"
          value={
            String(
              safeProductForm.kcal ??
              ""
            )
          }
          onChangeText={(
            value
          ) =>
            setProductForm(
              (current) => ({
                ...(current || {}),
                kcal: value,
              })
            )
          }
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <FormInput
          label="Белки"
          value={
            String(
              safeProductForm.protein ??
              ""
            )
          }
          onChangeText={(
            value
          ) =>
            setProductForm(
              (current) => ({
                ...(current || {}),
                protein: value,
              })
            )
          }
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <FormInput
          label="Жиры"
          value={
            String(
              safeProductForm.fat ??
              ""
            )
          }
          onChangeText={(
            value
          ) =>
            setProductForm(
              (current) => ({
                ...(current || {}),
                fat: value,
              })
            )
          }
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <FormInput
          label="Углеводы"
          value={
            String(
              safeProductForm.carbs ??
              ""
            )
          }
          onChangeText={(
            value
          ) =>
            setProductForm(
              (current) => ({
                ...(current || {}),
                carbs: value,
              })
            )
          }
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <FormInput
          label="Клетчатка"
          value={
            String(
              safeProductForm.fiber ??
              ""
            )
          }
          onChangeText={(
            value
          ) =>
            setProductForm(
              (current) => ({
                ...(current || {}),
                fiber: value,
              })
            )
          }
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <FormInput
          label="Фото продукта"
          value={
            safeProductForm.image ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setProductForm(
              (current) => ({
                ...(current || {}),
                image: value,
              })
            )
          }
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
        />
        {!!safeProductForm.image && (
          <ImageWithFallback
            uri={
              safeProductForm.image
            }
            style={
              styles.editorImagePreview
            }
            fallback="🥕"
          />
        )}
        <PrimaryButton
          title={
            editing
              ? "Сохранить продукт"
              : "Создать продукт"
          }
          onPress={
            saveProduct
          }
        />
        <SecondaryButton
          title="Отмена"
          onPress={() =>
            setScreen("author")
          }
        />
      </View>
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}
// ============================================================
// RECIPE EDITOR
// ============================================================
function renderAuthorRecipeScreen() {
  const editing =
    Boolean(editingRecipeId);
  const productsArray =
    ensureProductsArray(
      products
    );
  const safeIngredients =
    Array.isArray(
      recipeForm?.ingredients
    )
      ? recipeForm.ingredients
      : [];
  const safeSteps =
    Array.isArray(
      recipeForm?.steps
    )
      ? recipeForm.steps
      : [];
  const safeRecipeForm =
    recipeForm &&
    typeof recipeForm === "object"
      ? recipeForm
      : {
          title: "",
          category: "Другое",
          description: "",
          image: "",
          servings: 1,
          prepTime: 0,
          cookTime: 0,
          pro: false,
        };
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={
          styles.simpleTopBar
        }
      >
        <Pressable
          onPress={() =>
            setScreen("author")
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </Pressable>
        <Text
          style={
            styles.simpleTopTitle
          }
        >
          {editing
            ? "Изменить рецепт"
            : "Новый рецепт"}
        </Text>
        <View
          style={{
            width: 42,
          }}
        />
      </View>
      <View
        style={
          styles.formCard
        }
      >
        <FormInput
          label="Название рецепта"
          value={
            safeRecipeForm.title ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setRecipeForm(
              (current) => ({
                ...(current || {}),
                title: value,
              })
            )
          }
          placeholder="Например, Синабоны"
        />
        <FormInput
          label="Категория"
          value={
            safeRecipeForm.category ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setRecipeForm(
              (current) => ({
                ...(current || {}),
                category: value,
              })
            )
          }
          placeholder="Выпечка"
        />
        <FormInput
          label="Описание"
          value={
            safeRecipeForm.description ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setRecipeForm(
              (current) => ({
                ...(current || {}),
                description: value,
              })
            )
          }
          placeholder="Коротко о рецепте"
          multiline
        />
        <FormInput
          label="Фото рецепта"
          value={
            safeRecipeForm.image ||
            ""
          }
          onChangeText={(
            value
          ) =>
            setRecipeForm(
              (current) => ({
                ...(current || {}),
                image: value,
              })
            )
          }
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
        />
        {!!safeRecipeForm.image && (
          <ImageWithFallback
            uri={
              safeRecipeForm.image
            }
            style={
              styles.editorImagePreview
            }
            fallback="🍳"
          />
        )}
        <View
          style={
            styles.formTwoColumns
          }
        >
          <View
            style={
              styles.formHalf
            }
          >
            <FormInput
              label="Порций"
              value={String(
                safeRecipeForm.servings ||
                  1
              )}
              onChangeText={(
                value
              ) =>
                setRecipeForm(
                  (current) => ({
                    ...(current || {}),
                    servings:
                      Number(value) ||
                      1,
                  })
                )
              }
              keyboardType="numeric"
            />
          </View>
          <View
            style={
              styles.formHalf
            }
          >
            <FormInput
              label="Подготовка, мин"
              value={String(
                safeRecipeForm.prepTime ||
                  0
              )}
              onChangeText={(
                value
              ) =>
                setRecipeForm(
                  (current) => ({
                    ...(current || {}),
                    prepTime:
                      Number(value) ||
                      0,
                  })
                )
              }
              keyboardType="numeric"
            />
          </View>
        </View>
        <FormInput
          label="Готовка, мин"
          value={String(
            safeRecipeForm.cookTime ||
              0
          )}
          onChangeText={(
            value
          ) =>
            setRecipeForm(
              (current) => ({
                ...(current || {}),
                cookTime:
                  Number(value) ||
                  0,
              })
            )
          }
          keyboardType="numeric"
        />
        <Pressable
          style={
            styles.proToggle
          }
          onPress={() =>
            setRecipeForm(
              (current) => ({
                ...(current || {}),
                pro: !Boolean(
                  current?.pro
                ),
              })
            )
          }
        >
          <View
            style={[
              styles.checkbox,
              safeRecipeForm.pro &&
                styles.checkboxActive,
            ]}
          >
            {safeRecipeForm.pro && (
              <Text
                style={
                  styles.checkboxCheck
                }
              >
                ✓
              </Text>
            )}
          </View>
          <View
            style={
              styles.proToggleMain
            }
          >
            <Text
              style={
                styles.proToggleTitle
              }
            >
              PRO-рецепт
            </Text>
            <Text
              style={
                styles.proToggleText
              }
            >
              Отметить рецепт как доступный по подписке PRO
            </Text>
          </View>
        </Pressable>
      </View>
      <SectionTitle
        title="Ингредиенты"
      />
      <View
        style={
          styles.formCard
        }
      >
        {safeIngredients.length ===
          0 && (
          <Text
            style={
              styles.mutedText
            }
          >
            Добавь продукты, которые входят в рецепт.
          </Text>
        )}
        {safeIngredients.map(
          (
            ingredient,
            index
          ) => (
            <View
              key={`ingredient-editor-${index}`}
              style={
                styles.ingredientEditorRow
              }
            >
              <View
                style={
                  styles.ingredientEditorSelect
                }
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={{
                    alignItems:
                      "center",
                  }}
                >
                  {productsArray.map(
                    (
                      product
                    ) => {
                      const active =
                        String(
                          ingredient?.productId ||
                            ingredient?.product_id ||
                            ""
                        ) ===
                        String(
                          product?.id
                        );
                      return (
                        <Pressable
                          key={
                            product.id
                          }
                          onPress={() =>
                            updateRecipeIngredient(
                              index,
                              "productId",
                              product.id
                            )
                          }
                          style={[
                            styles.ingredientProductChip,
                            active &&
                              styles.ingredientProductChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.ingredientProductChipText,
                              active &&
                                styles.ingredientProductChipTextActive,
                            ]}
                            numberOfLines={
                              1
                            }
                          >
                            {
                              product.name
                            }
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </ScrollView>
              </View>
            </View>
          )
        )}
        {safeIngredients.map(
          (
            ingredient,
            index
          ) => {
            const selectedProduct =
              productsArray.find(
                (
                  product
                ) =>
                  String(
                    product?.id
                  ) ===
                  String(
                    ingredient?.productId ||
                      ingredient?.product_id ||
                      ""
                  )
              );
            return (
              <View
                key={`ingredient-row-${index}`}
                style={
                  styles.ingredientWeightRow
                }
              >
                <Text
                  style={
                    styles.ingredientWeightName
                  }
                  numberOfLines={
                    1
                  }
                >
                  {selectedProduct?.name ||
                    ingredient?.product ||
                    "Выбери продукт"}
                </Text>
                <TextInput
                  value={String(
                    ingredient?.grams ??
                      ingredient?.amount ??
                      0
                  )}
                  onChangeText={(
                    value
                  ) =>
                    updateRecipeIngredient(
                      index,
                      "grams",
                      value
                    )
                  }
                  keyboardType="decimal-pad"
                  style={
                    styles.ingredientWeightInput
                  }
                  placeholder="г"
                />
                <Pressable
                  onPress={() =>
                    removeRecipeIngredient(
                      index
                    )
                  }
                  style={
                    styles.deleteIngredientButton
                  }
                >
                  <Text>
                    ✕
                  </Text>
                </Pressable>
              </View>
            );
          }
        )}
        <SecondaryButton
          title="+ Добавить ингредиент"
          onPress={
            addRecipeIngredient
          }
        />
        <View
          style={
            styles.nutritionPreview
          }
        >
          <Text
            style={
              styles.nutritionPreviewTitle
            }
          >
            Расчёт рецепта
          </Text>
          <View
            style={
              styles.nutritionPreviewGrid
            }
          >
            <StatCard
              label="Ккал"
              value={Math.round(
                Number(
                  recipeFormNutrition?.kcal ||
                    0
                )
              )}
            />
            <StatCard
              label="Белки"
              value={`${Math.round(
                Number(
                  recipeFormNutrition?.protein ||
                    0
                )
              )} г`}
            />
            <StatCard
              label="Жиры"
              value={`${Math.round(
                Number(
                  recipeFormNutrition?.fat ||
                    0
                )
              )} г`}
            />
            <StatCard
              label="Углеводы"
              value={`${Math.round(
                Number(
                  recipeFormNutrition?.carbs ||
                    0
                )
              )} г`}
            />
          </View>
        </View>
      </View>
      <SectionTitle
        title="Приготовление"
      />
      <View
        style={
          styles.formCard
        }
      >
        {safeSteps.map(
          (
            step,
            index
          ) => (
            <View
              key={`step-editor-${index}`}
              style={
                styles.stepEditorRow
              }
            >
              <View
                style={
                  styles.stepEditorNumber
                }
              >
                <Text
                  style={
                    styles.stepEditorNumberText
                  }
                >
                  {index + 1}
                </Text>
              </View>
              <TextInput
                value={String(
                  step ?? ""
                )}
                onChangeText={(
                  value
                ) =>
                  updateRecipeStep(
                    index,
                    value
                  )
                }
                multiline
                placeholder={`Шаг ${
                  index + 1
                }`}
                style={
                  styles.stepEditorInput
                }
              />
              <Pressable
                onPress={() =>
                  removeRecipeStep(
                    index
                  )
                }
                style={
                  styles.deleteIngredientButton
                }
              >
                <Text>
                  ✕
                </Text>
              </Pressable>
            </View>
          )
        )}
        <SecondaryButton
          title="+ Добавить шаг"
          onPress={
            addRecipeStep
          }
        />
      </View>
      <PrimaryButton
        title={
          editing
            ? "Сохранить рецепт"
            : "Создать рецепт"
        }
        onPress={
          saveRecipe
        }
      />
      <SecondaryButton
        title="Отмена"
        onPress={() =>
          setScreen("author")
        }
      />
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// SETTINGS SCREEN
// ============================================================
function renderSettingsScreen() {
  const recipesArray =
    Array.isArray(recipes)
      ? recipes
      : [];
  const productsArray =
    ensureProductsArray(
      products
    );
  const safeSettings =
    settings &&
    typeof settings === "object"
      ? settings
      : DEFAULT_SETTINGS;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <View
        style={
          styles.simpleTopBar
        }
      >
        <Pressable
          onPress={
            goProfile
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </Pressable>
        <Text
          style={
            styles.simpleTopTitle
          }
        >
          Настройки
        </Text>
        <View
          style={{
            width: 42,
          }}
        />
      </View>
      <SectionTitle
        title="Приложение"
      />
      <View
        style={
          styles.settingsCard
        }
      >
        <View
          style={
            styles.settingRow
          }
        >
          <View
            style={
              styles.settingIcon
            }
          >
            <Text>
              🔔
            </Text>
          </View>
          <View
            style={
              styles.settingMain
            }
          >
            <Text
              style={
                styles.settingTitle
              }
            >
              Уведомления
            </Text>
            <Text
              style={
                styles.settingText
              }
            >
              Напоминания о питании
            </Text>
          </View>
          <Pressable
            onPress={() =>
              setSettings(
                (current) => ({
                  ...(current || {}),
                  notifications:
                    !Boolean(
                      current?.notifications
                    ),
                })
              )
            }
            style={[
              styles.switch,
              safeSettings.notifications &&
                styles.switchActive,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                safeSettings.notifications &&
                  styles.switchThumbActive,
              ]}
            />
          </Pressable>
        </View>
        <View
          style={
            styles.settingDivider
          }
        />
        <View
          style={
            styles.settingRow
          }
        >
          <View
            style={
              styles.settingIcon
            }
          >
            <Text>
              📊
            </Text>
          </View>
          <View
            style={
              styles.settingMain
            }
          >
            <Text
              style={
                styles.settingTitle
              }
            >
              Показывать КБЖУ
            </Text>
            <Text
              style={
                styles.settingText
              }
            >
              КБЖУ отображается в
              карточках рецептов
            </Text>
          </View>
          <Pressable
            onPress={() =>
              setSettings(
                (current) => ({
                  ...(current || {}),
                  showNutrition:
                    !Boolean(
                      current?.showNutrition
                    ),
                })
              )
            }
            style={[
              styles.switch,
              safeSettings.showNutrition &&
                styles.switchActive,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                safeSettings.showNutrition &&
                  styles.switchThumbActive,
              ]}
            />
          </Pressable>
        </View>
      </View>
      <SectionTitle
        title="Данные"
      />
      <Pressable
        style={
          styles.settingsAction
        }
        onPress={
          resetLocalData
        }
      >
        <View
          style={
            styles.settingsActionIcon
          }
        >
          <Text>
            🗑️
          </Text>
        </View>
        <View
          style={
            styles.settingMain
          }
        >
          <Text
            style={
              styles.settingsActionTitle
            }
          >
            Сбросить локальные данные
          </Text>
          <Text
            style={
              styles.settingText
            }
          >
            Вернуть стандартные
            продукты и рецепты
          </Text>
        </View>
        <Text
          style={
            styles.menuArrow
          }
        >
          ›
        </Text>
      </Pressable>
      <View
        style={
          styles.infoCard
        }
      >
        <Text
          style={
            styles.infoCardTitle
          }
        >
          PaCook
        </Text>
        <Text
          style={
            styles.infoCardText
          }
        >
          Рецепты:{" "}
          {recipesArray.length}
          {"\n"}
          Продукты:{" "}
          {productsArray.length}
          {"\n"}
          Версия приложения:
          1.0.0
        </Text>
      </View>
      <View
        style={
          styles.bottomSpacer
        }
      />
    </ScrollView>
  );
}

  // ============================================================
// AUTH SCREEN
// ============================================================
function renderAuthScreen() {
  const isSignup =
    authMode === "signup";
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.authContainer
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={
        false
      }
    >
      <View
        style={
          styles.authLogo
        }
      >
        <Text
          style={
            styles.authLogoText
          }
        >
          PaCook
        </Text>
        <Text
          style={
            styles.authLogoSubtitle
          }
        >
          Cook smart. Eat better.
        </Text>
      </View>
      <View
        style={
          styles.authCard
        }
      >
        <Text
          style={
            styles.authTitle
          }
        >
          {isSignup
            ? "Создать аккаунт"
            : "С возвращением"}
        </Text>
        <Text
          style={
            styles.authSubtitle
          }
        >
          {isSignup
            ? "Сохрани свои рецепты и профиль"
            : "Войди в свой PaCook"}
        </Text>
        {isSignup && (
          <FormInput
            label="Имя"
            value={
              authNameState || ""
            }
            onChangeText={
              setAuthNameState
            }
            placeholder="Твоё имя"
          />
        )}
        <FormInput
          label="Email"
          value={
            authEmailState || ""
          }
          onChangeText={
            setAuthEmailState
          }
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <FormInput
          label="Пароль"
          value={
            authPasswordState || ""
          }
          onChangeText={
            setAuthPasswordState
          }
          placeholder="Минимум 6 символов"
          secureTextEntry
        />
        {renderAuthError()}
        <PrimaryButton
          title={
            authLoading
              ? "Подождите..."
              : isSignup
              ? "Создать аккаунт"
              : "Войти"
          }
          disabled={
            Boolean(authLoading)
          }
          onPress={
            handleAuthSubmit
          }
        />
        <Pressable
          onPress={() => {
            setAuthError("");
            setAuthMode(
              isSignup
                ? "login"
                : "signup"
            );
          }}
          style={
            styles.authSwitch
          }
        >
          <Text
            style={
              styles.authSwitchText
            }
          >
            {isSignup
              ? "Уже есть аккаунт? Войти"
              : "Нет аккаунта? Зарегистрироваться"}
          </Text>
        </Pressable>
        <Pressable
          onPress={
            goHome
          }
          style={
            styles.authBackHome
          }
        >
          <Text
            style={
              styles.authBackHomeText
            }
          >
            Продолжить без
            авторизации
          </Text>
        </Pressable>
      </View>
      <Text
        style={
          styles.authFooter
        }
      >
        После входа твои авторские
        рецепты, продукты и профиль
        будут привязаны к аккаунту.
      </Text>
    </ScrollView>
  );
}
// ============================================================
// AUTH STATE
// ============================================================
const authFormState =
  useMemo(
    () => ({
      email:
        authEmailState || "",
      password:
        authPasswordState || "",
      name:
        authNameState || "",
    }),
    [
      authEmailState,
      authPasswordState,
      authNameState,
    ]
  );
// ============================================================
// AUTH SCREEN HELPERS
// ============================================================
function renderAuthError() {
  if (!authError) {
    return null;
  }
  return (
    <View
      style={
        styles.authErrorBox
      }
    >
      <Text
        style={
          styles.authErrorText
        }
      >
        {String(authError)}
      </Text>
    </View>
  );
}
// ============================================================
// BOTTOM NAVIGATION
// ============================================================
function renderBottomNavigation() {
  const items = [
    {
      id: "home",
      title: "Главная",
      icon: "⌂",
      onPress:
        goHome,
    },
    {
      id: "recipes",
      title: "Рецепты",
      icon: "🍳",
      onPress:
        goRecipes,
    },
    {
      id: "products",
      title: "Продукты",
      icon: "🥕",
      onPress:
        goProducts,
    },
    {
      id: "diary",
      title: "Дневник",
      icon: "📅",
      onPress:
        goDiary,
    },
    {
      id: "profile",
      title: "Профиль",
      icon: "👤",
      onPress:
        goProfile,
    },
  ];
  return (
    <View
      style={
        styles.bottomNavigation
      }
    >
      {items.map(
        (item) => {
          const active =
            screen ===
            item.id;
          return (
            <Pressable
              key={
                item.id
              }
              onPress={
                item.onPress
              }
              style={
                styles.bottomNavItem
              }
            >
              <View
                style={[
                  styles.bottomNavIconWrap,
                  active &&
                    styles.bottomNavIconWrapActive,
                ]}
              >
                <Text
                  style={[
                    styles.bottomNavIcon,
                    active &&
                      styles.bottomNavIconActive,
                  ]}
                >
                  {
                    item.icon
                  }
                </Text>
              </View>
              <Text
                style={[
                  styles.bottomNavText,
                  active &&
                    styles.bottomNavTextActive,
                ]}
              >
                {
                  item.title
                }
              </Text>
            </Pressable>
          );
        }
      )}
    </View>
  );
}
// ============================================================
// AUTH SCREEN SWITCH
// ============================================================
if (screen === "auth") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderAuthScreen()}
    </View>
  );
}
// ============================================================
// PROFILE SWITCH
// ============================================================
if (screen === "profile") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderProfileScreen()}
      {renderBottomNavigation()}
    </View>
  );
}
if (screen === "profileEdit") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderProfileEditScreen()}
    </View>
  );
}
// ============================================================
// AUTHOR SWITCH
// ============================================================
if (screen === "author") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderAuthorScreen()}
    </View>
  );
}
if (screen === "authorProduct") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderAuthorProductScreen()}
    </View>
  );
}
if (screen === "authorRecipe") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderAuthorRecipeScreen()}
    </View>
  );
}
// ============================================================
// SETTINGS SWITCH
// ============================================================
if (screen === "settings") {
  return (
    <View
      style={
        styles.appContainer
      }
    >
      {renderSettingsScreen()}
    </View>
  );
}
// ============================================================
// FALLBACK
// ============================================================
return (
  <View
    style={
      styles.appContainer
    }
  >
    <Text
      style={{
        fontSize: 24,
        fontWeight: "700",
        margin: 30,
        color: "#345C48",
      }}
    >
      PaCook запущен
    </Text>
    <Text
      style={{
        marginHorizontal: 30,
        color: "#1D2922",
      }}
    >
      Проверка запуска приложения
    </Text>
  </View>
);

  // ============================================================
// AUTH ERROR
// ============================================================
function renderAuthError() {
  if (!authError) {
    return null;
  }
  return (
    <View
      style={
        styles.authErrorBox
      }
    >
      <Text
        style={
          styles.authErrorText
        }
      >
        {String(authError)}
      </Text>
    </View>
  );
}
// ============================================================
// AUTH SUBMIT
// ============================================================
async function handleAuthSubmit() {
  if (authLoading) {
    return;
  }
  setAuthError("");
  const email =
    String(
      authEmailState || ""
    ).trim();
  const password =
    String(
      authPasswordState || ""
    );
  const name =
    String(
      authNameState || ""
    ).trim();
  if (!email) {
    setAuthError(
      "Введите email."
    );
    return;
  }
  if (!password) {
    setAuthError(
      "Введите пароль."
    );
    return;
  }
  if (
    password.length < 6
  ) {
    setAuthError(
      "Пароль должен содержать минимум 6 символов."
    );
    return;
  }
  if (
    authMode === "signup" &&
    !name
  ) {
    setAuthError(
      "Введите имя."
    );
    return;
  }
  setAuthLoading(true);
  try {
    // ==========================================================
    // REGISTRATION
    // ==========================================================
    if (
      authMode === "signup"
    ) {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp(
          {
            email,
            password,
            options: {
              data: {
                name:
                  name ||
                  "PaCook User",
              },
            },
          }
        );
      if (error) {
        throw error;
      }
      // Если Supabase сразу вернул сессию
      if (
        data?.session &&
        data?.user
      ) {
        setAuthUser(
          data.user
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.session,
          JSON.stringify(
            data.user
          )
        );
        setAuthEmailState("");
        setAuthPasswordState("");
        setAuthNameState("");
        setAuthError("");
        setScreen(
          "home"
        );
      } else {
        // Если включено подтверждение email
        setAuthError(
          "Аккаунт создан. Проверьте почту и подтвердите регистрацию."
        );
        setAuthMode(
          "login"
        );
      }
      return;
    }
    // ==========================================================
    // LOGIN
    // ==========================================================
    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );
    if (error) {
      throw error;
    }
    if (
      data?.user
    ) {
      setAuthUser(
        data.user
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.session,
        JSON.stringify(
          data.user
        )
      );
      setAuthEmailState("");
      setAuthPasswordState("");
      setAuthNameState("");
      setAuthError("");
      setAuthorMode(false);
      setScreen(
        "home"
      );
    } else {
      setAuthError(
        "Не удалось получить данные аккаунта."
      );
    }
  } catch (error) {
    console.error(
      "AUTH ERROR",
      error
    );
    const message =
      String(
        error?.message ||
        error?.error_description ||
        error ||
        ""
      ).trim();
    if (
      message.toLowerCase().includes(
        "invalid login credentials"
      )
    ) {
      setAuthError(
        "Неверный email или пароль."
      );
    } else if (
      message.toLowerCase().includes(
        "email not confirmed"
      )
    ) {
      setAuthError(
        "Сначала подтвердите email через письмо от Supabase."
      );
    } else if (
      message.toLowerCase().includes(
        "user already registered"
      )
    ) {
      setAuthError(
        "Этот email уже зарегистрирован. Попробуйте войти."
      );
    } else {
      setAuthError(
        message ||
          "Не удалось выполнить вход."
      );
    }
  } finally {
    setAuthLoading(
      false
    );
  }
}

  // ============================================================
// LOGOUT
// ============================================================
async function logoutUser() {
  try {
    await AsyncStorage.removeItem(
      STORAGE_KEYS.session
    );
  } catch (error) {
    console.log(
      "SESSION REMOVE ERROR",
      error
    );
  }
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.log(
      "SUPABASE LOGOUT ERROR",
      error
    );
  }
  setAuthUser(null);
  setAuthorUnlocked(false);
  setAuthorMode(false);
  setScreen("home");
}
// ============================================================
// PROFILE
// ============================================================
function startEditProfile() {
  const currentProfile =
    profile &&
    typeof profile === "object"
      ? profile
      : {};
  setProfileForm({
    ...currentProfile,
    name:
      currentProfile.name ||
      authUser?.user_metadata?.name ||
      "",
    username:
      currentProfile.username ||
      "",
    bio:
      currentProfile.bio ||
      "",
    avatar:
      currentProfile.avatar ||
      currentProfile.avatarUrl ||
      "",
    photo:
      currentProfile.photo ||
      "",
    city:
      currentProfile.city ||
      "",
    age:
      currentProfile.age ||
      "",
    goal:
      currentProfile.goal ||
      "",
  });
  setScreen("profileEdit");
}
async function saveProfile() {
  const currentProfile =
    profile &&
    typeof profile === "object"
      ? profile
      : {};
  const currentForm =
    profileForm &&
    typeof profileForm === "object"
      ? profileForm
      : {};
  const nextProfile = {
    ...currentProfile,
    ...currentForm,
    name:
      String(
        currentForm.name ||
          authUser?.user_metadata?.name ||
          ""
      ).trim() ||
      "PaCook User",
    username:
      String(
        currentForm.username ||
          ""
      ).trim(),
    bio:
      String(
        currentForm.bio ||
          ""
      ).trim(),
    avatar:
      String(
        currentForm.avatar ||
          currentForm.avatarUrl ||
          ""
      ).trim(),
    photo:
      String(
        currentForm.photo ||
          ""
      ).trim(),
    city:
      String(
        currentForm.city ||
          ""
      ).trim(),
    age:
      String(
        currentForm.age ||
          ""
      ).trim(),
    goal:
      String(
        currentForm.goal ||
          ""
      ).trim(),
    updatedAt:
      Date.now(),
  };
  setProfile(nextProfile);
  setProfileForm(nextProfile);
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify(
        nextProfile
      )
    );
  } catch (error) {
    console.log(
      "PROFILE LOCAL SAVE ERROR",
      error
    );
  }
  if (authUser?.id) {
    try {
      const { error } =
        await supabase
          .from("profiles")
          .upsert(
            {
              id:
                authUser.id,
              name:
                nextProfile.name,
              username:
                nextProfile.username ||
                null,
              bio:
                nextProfile.bio ||
                null,
              avatar:
                nextProfile.avatar ||
                null,
              photo:
                nextProfile.photo ||
                null,
              city:
                nextProfile.city ||
                null,
              age:
                nextProfile.age ||
                null,
              goal:
                nextProfile.goal ||
                null,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "id",
            }
          );
      if (error) {
        console.log(
          "PROFILE REMOTE SAVE ERROR",
          error
        );
      }
    } catch (error) {
      console.log(
        "PROFILE REMOTE SAVE ERROR",
        error
      );
    }
  }
  setScreen("profile");
}
// ============================================================
// AUTHOR MODE
// ============================================================
function enterAuthorMode() {
  if (!authUser) {
    setScreen("auth");
    return;
  }
  if (authorUnlocked) {
    setAuthorMode(true);
    setScreen("author");
    return;
  }
  setAuthorUnlocked(true);
  setAuthorMode(true);
  setScreen("author");
}
function leaveAuthorMode() {
  setAuthorMode(false);
  setScreen("profile");
}
// ============================================================
// SETTINGS
// ============================================================
function goSettings() {
  setScreen("settings");
}
// ============================================================
// PRODUCT EDITING
// ============================================================
function startNewProduct() {
  setEditingProductName(null);
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
  setScreen("authorProduct");
}
function startEditProduct(product) {
  if (!product) {
    return;
  }
  setEditingProductName(
    product.name || ""
  );
  setProductForm({
    name:
      product.name || "",
    category:
      product.category ||
      "Другое",
    kcal:
      String(
        product.kcal ??
          product.calories ??
          ""
      ),
    protein:
      String(
        product.protein ??
          ""
      ),
    fat:
      String(
        product.fat ??
          ""
      ),
    carbs:
      String(
        product.carbs ??
          ""
      ),
    fiber:
      String(
        product.fiber ??
          ""
      ),
    image:
      product.image ||
      product.image_url ||
      "",
  });
  setScreen("authorProduct");
}
async function saveProduct() {
  try {
    const form =
      productForm &&
      typeof productForm === "object"
        ? productForm
        : {};
    const name =
      String(
        form.name || ""
      ).trim();
    if (!name) {
      if (
        typeof window !== "undefined" &&
        window.alert
      ) {
        window.alert(
          "Введите название продукта."
        );
      } else {
        Alert.alert(
          "Ошибка",
          "Введите название продукта."
        );
      }
      return;
    }
    const kcal =
      Number(
        form.kcal ??
          form.calories ??
          0
      ) || 0;
    const protein =
      Number(
        form.protein || 0
      ) || 0;
    const fat =
      Number(
        form.fat || 0
      ) || 0;
    const carbs =
      Number(
        form.carbs || 0
      ) || 0;
    const fiber =
      Number(
        form.fiber || 0
      ) || 0;
    const category =
      String(
        form.category ||
          "Другое"
      ).trim();
    const image =
      String(
        form.image ||
          ""
      ).trim();
    const oldName =
      editingProductName
        ? String(
            editingProductName
          )
        : null;
    const productsArray =
      ensureProductsArray(
        products
      );
    // Не разрешаем создать два продукта
    // с одинаковым названием.
    const duplicate =
      productsArray.find(
        (item) =>
          String(
            item?.name || ""
          ).toLowerCase() ===
            name.toLowerCase() &&
          String(
            item?.name || ""
          ).toLowerCase() !==
            String(
              oldName || ""
            ).toLowerCase()
      );
    if (duplicate) {
      if (
        typeof window !== "undefined" &&
        window.alert
      ) {
        window.alert(
          "Такой продукт уже существует."
        );
      } else {
        Alert.alert(
          "Ошибка",
          "Такой продукт уже существует."
        );
      }
      return;
    }
    const existingProduct =
      oldName
        ? productsArray.find(
            (item) =>
              String(
                item?.name || ""
              ) ===
              String(
                oldName
              )
          )
        : null;
    const product = {
      id:
        existingProduct?.id ||
        form.id ||
        `user-product-${Date.now()}`,
      name,
      category,
      kcal,
      protein,
      fat,
      carbs,
      fiber,
      image,
      custom: true,
      author_id:
        authUser?.id ||
        null,
      updated_at:
        new Date().toISOString(),
    };
    let nextProducts =
      [...productsArray];
    if (oldName) {
      nextProducts =
        nextProducts.map(
          (item) =>
            String(
              item?.name || ""
            ) ===
            String(oldName)
              ? product
              : item
        );
    } else {
      nextProducts.push(
        product
      );
    }
    nextProducts =
      ensureProductsArray(
        nextProducts
      );
    const nextDeletedProducts =
      Array.isArray(
        deletedProducts
      )
        ? deletedProducts.filter(
            (item) =>
              String(item) !==
              String(oldName || "") &&
              String(item) !==
              String(product.id)
          )
        : [];
    setProducts(
      nextProducts
    );
    setDeletedProducts(
      nextDeletedProducts
    );
    setEditingProductName(
      null
    );
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
    await persistEverything({
      products:
        nextProducts,
      deletedProducts:
        nextDeletedProducts,
    });
    if (authUser) {
      await safeSupabaseUpsert(
        "products",
        [
          product,
        ]
      );
    }
    setSaving(false);
    setScreen("author");
  } catch (error) {
    console.log(
      "SAVE PRODUCT ERROR:",
      error
    );
    setSaving(false);
    if (
      typeof window !== "undefined" &&
      window.alert
    ) {
      window.alert(
        "Не удалось сохранить продукт: " +
          String(
            error?.message ||
              error
          )
      );
    } else {
      Alert.alert(
        "Ошибка",
        "Не удалось сохранить продукт."
      );
    }
  }
}
async function removeProduct(
  product
) {
  if (!product) {
    return;
  }
  const confirmed =
    await confirmDelete(
      `Удалить продукт «${
        product.name ||
        "Продукт"
      }»?`
    );
  if (!confirmed) {
    return;
  }
  const productId =
    product.id;
  const productsArray =
    ensureProductsArray(
      products
    );
  const nextProducts =
    productsArray.filter(
      (item) =>
        String(
          item?.id
        ) !==
        String(
          productId
        )
    );
  const deletedArray =
    Array.isArray(
      deletedProducts
    )
      ? deletedProducts
      : [];
  const nextDeletedProducts =
    [
      ...deletedArray,
      productId,
    ].filter(
      (value, index, array) =>
        array.findIndex(
          (item) =>
            String(item) ===
            String(value)
        ) === index
    );
  setProducts(
    nextProducts
  );
  setDeletedProducts(
    nextDeletedProducts
  );
  await persistEverything({
    products:
      nextProducts,
    deletedProducts:
      nextDeletedProducts,
  });
  if (authUser) {
    await safeSupabaseDelete(
      "products",
      productId
    );
  }
  if (
    editingProductName &&
    String(
      editingProductName
    ) ===
      String(
        product.name
      )
  ) {
    setEditingProductName(
      null
    );
  }
}

  // ============================================================
// RECIPE EDITING
// ============================================================
function startNewRecipe() {
  setEditingRecipeId(null);
  setRecipeForm({
    title: "",
    category: "Другое",
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
    servings: 1,
    prepTime: 0,
    cookTime: 0,
  });
  setScreen("authorRecipe");
}
function startEditRecipe(recipe) {
  if (!recipe) {
    return;
  }
  const ingredients =
    Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((item) => {
          const productId =
            String(
              item?.productId ||
                item?.product_id ||
                ""
            ).trim();
          const productName =
            String(
              item?.product ||
                item?.productName ||
                item?.name ||
                ""
            ).trim();
          const grams =
            Number(
              item?.grams ??
                item?.amount ??
                0
            ) || 0;
          const productsArray =
            ensureProductsArray(products);
          const selectedProduct =
            productsArray.find(
              (product) =>
                String(product?.id) ===
                String(productId)
            );
          const finalProductName =
            productName ||
            selectedProduct?.name ||
            "";
          return {
            ...item,
            product:
              finalProductName,
            productId:
              productId ||
              selectedProduct?.id ||
              "",
            product_id:
              productId ||
              selectedProduct?.id ||
              "",
            grams,
            amount: grams,
          };
        })
      : [];
  setEditingRecipeId(
    recipe.id || null
  );
  setRecipeForm({
    title:
      recipe.title ||
      recipe.name ||
      "",
    description:
      recipe.description ||
      "",
    category:
      recipe.category ||
      "Другое",
    image:
      recipe.image ||
      recipe.image_url ||
      "",
    ingredients:
      ingredients.length
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
    steps:
      Array.isArray(recipe.steps) &&
      recipe.steps.length
        ? [...recipe.steps]
        : [""],
    pro:
      Boolean(recipe.pro),
    servings:
      Number(recipe.servings) || 1,
    prepTime:
      Number(recipe.prepTime) || 0,
    cookTime:
      Number(recipe.cookTime) || 0,
  });
  setScreen("authorRecipe");
}
function updateRecipeIngredient(
  index,
  field,
  value
) {
  setRecipeForm((current) => {
    const ingredients =
      Array.isArray(current?.ingredients)
        ? [...current.ingredients]
        : [];
    const oldIngredient =
      ingredients[index] || {
        product: "",
        productId: "",
        product_id: "",
        grams: 0,
        amount: 0,
      };
    let nextValue = value;
    if (
      field === "grams" ||
      field === "amount"
    ) {
      nextValue =
        Number(value) || 0;
    }
    const updatedIngredient = {
      ...oldIngredient,
      [field]: nextValue,
    };
    if (
      field === "productId" ||
      field === "product_id"
    ) {
      const productsArray =
        ensureProductsArray(products);
      const selectedProduct =
        productsArray.find(
          (product) =>
            String(product?.id) ===
            String(nextValue)
        );
      if (selectedProduct) {
        updatedIngredient.product =
          selectedProduct.name;
        updatedIngredient.productId =
          selectedProduct.id;
        updatedIngredient.product_id =
          selectedProduct.id;
      }
    }
    if (field === "product") {
      const productsArray =
        ensureProductsArray(products);
      const selectedProduct =
        productsArray.find(
          (product) =>
            String(product?.name) ===
            String(nextValue)
        );
      if (selectedProduct) {
        updatedIngredient.product =
          selectedProduct.name;
        updatedIngredient.productId =
          selectedProduct.id;
        updatedIngredient.product_id =
          selectedProduct.id;
      }
    }
    if (field === "grams") {
      updatedIngredient.amount =
        nextValue;
    }
    if (field === "amount") {
      updatedIngredient.grams =
        nextValue;
    }
    ingredients[index] =
      updatedIngredient;
    return {
      ...(current || {}),
      ingredients,
    };
  });
}
function removeRecipeIngredient(
  index
) {
  setRecipeForm((current) => {
    const ingredients =
      Array.isArray(current?.ingredients)
        ? current.ingredients
        : [];
    const nextIngredients =
      ingredients.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );
    return {
      ...(current || {}),
      ingredients:
        nextIngredients.length
          ? nextIngredients
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
function addRecipeIngredient() {
  const productsArray =
    ensureProductsArray(products);
  const firstProduct =
    productsArray[0] || null;
  setRecipeForm((current) => ({
    ...(current || {}),
    ingredients: [
      ...(Array.isArray(
        current?.ingredients
      )
        ? current.ingredients
        : []),
      {
        product:
          firstProduct?.name || "",
        productId:
          firstProduct?.id || "",
        product_id:
          firstProduct?.id || "",
        grams: 100,
        amount: 100,
      },
    ],
  }));
}
function updateRecipeStep(
  index,
  value
) {
  setRecipeForm((current) => {
    const steps =
      Array.isArray(current?.steps)
        ? [...current.steps]
        : [""];
    steps[index] =
      String(value ?? "");
    return {
      ...(current || {}),
      steps,
    };
  });
}
function removeRecipeStep(
  index
) {
  setRecipeForm((current) => {
    const steps =
      Array.isArray(current?.steps)
        ? current.steps
        : [""];
    const nextSteps =
      steps.filter(
        (_, stepIndex) =>
          stepIndex !== index
      );
    return {
      ...(current || {}),
      steps:
        nextSteps.length
          ? nextSteps
          : [""],
    };
  });
}
function addRecipeStep() {
  setRecipeForm((current) => ({
    ...(current || {}),
    steps: [
      ...(Array.isArray(
        current?.steps
      )
        ? current.steps
        : []),
      "",
    ],
  }));
}
async function saveRecipe() {
  try {
    const form =
      recipeForm &&
      typeof recipeForm === "object"
        ? recipeForm
        : {};
    const title =
      String(
        form.title || ""
      ).trim();
    if (!title) {
      if (
        typeof window !== "undefined" &&
        window.alert
      ) {
        window.alert(
          "Введите название рецепта."
        );
      } else {
        Alert.alert(
          "Ошибка",
          "Введите название рецепта."
        );
      }
      return;
    }
    const productsArray =
      ensureProductsArray(products);
    const recipesArray =
      Array.isArray(recipes)
        ? normalizeRecipes(recipes)
        : [];
    const recipeId =
      editingRecipeId ||
      form.id ||
      `user-recipe-${Date.now()}`;
    const existingRecipe =
      recipesArray.find(
        (item) =>
          String(item?.id) ===
          String(recipeId)
      ) || null;
    const ingredients =
      Array.isArray(
        form.ingredients
      )
        ? form.ingredients
            .map((item) => {
              const productId =
                String(
                  item?.productId ||
                    item?.product_id ||
                    ""
                ).trim();
              const productName =
                String(
                  item?.product ||
                    item?.productName ||
                    item?.name ||
                    ""
                ).trim();
              const grams =
                Number(
                  item?.grams ??
                    item?.amount ??
                    0
                ) || 0;
              const foundProduct =
                productId
                  ? productsArray.find(
                      (product) =>
                        String(
                          product?.id
                        ) ===
                        String(
                          productId
                        )
                    )
                  : null;
              const foundByName =
                !foundProduct &&
                productName
                  ? productsArray.find(
                      (product) =>
                        String(
                          product?.name
                        ) ===
                        String(
                          productName
                        )
                    )
                  : null;
              const finalProduct =
                foundProduct ||
                foundByName ||
                null;
              const finalProductName =
                finalProduct?.name ||
                productName ||
                "";
              const finalProductId =
                finalProduct?.id ||
                productId ||
                "";
              return {
                product:
                  finalProductName,
                productId:
                  finalProductId,
                product_id:
                  finalProductId,
                grams,
                amount: grams,
              };
            })
            .filter(
              (item) =>
                item.product &&
                item.grams > 0
            )
        : [];
    const steps =
      Array.isArray(form.steps)
        ? form.steps
            .map(
              (step) =>
                String(
                  step || ""
                ).trim()
            )
            .filter(Boolean)
        : [];
    const recipe = {
      ...(existingRecipe || {}),
      id:
        recipeId,
      title,
      name:
        title,
      description:
        String(
          form.description || ""
        ).trim(),
      category:
        String(
          form.category ||
            "Другое"
        ).trim(),
      image:
        String(
          form.image || ""
        ).trim(),
      image_url:
        String(
          form.image || ""
        ).trim(),
      ingredients,
      steps,
      pro:
        Boolean(form.pro),
      servings:
        Number(
          form.servings
        ) || 1,
      prepTime:
        Number(
          form.prepTime
        ) || 0,
      cookTime:
        Number(
          form.cookTime
        ) || 0,
      custom:
        true,
      author_id:
        authUser?.id ||
        existingRecipe?.author_id ||
        null,
      updated_at:
        new Date().toISOString(),
    };
    const recipesWithoutCurrent =
      recipesArray.filter(
        (item) =>
          String(item?.id) !==
          String(recipeId)
      );
    const nextRecipes =
      mergeRecipes(
        recipesWithoutCurrent,
        [recipe],
        []
      );
    const nextDeletedRecipes =
      (
        Array.isArray(
          deletedRecipes
        )
          ? deletedRecipes
          : []
      ).filter(
        (item) =>
          String(item) !==
          String(recipeId)
      );
    const safeNextRecipes =
      Array.isArray(nextRecipes)
        ? nextRecipes
        : recipesArray;
    setRecipes(
      safeNextRecipes
    );
    setDeletedRecipes(
      nextDeletedRecipes
    );
    setEditingRecipeId(null);
    setRecipeForm({
      title: "",
      category: "Другое",
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
      servings: 1,
      prepTime: 0,
      cookTime: 0,
    });
    await persistEverything({
      recipes:
        safeNextRecipes,
      deletedRecipes:
        nextDeletedRecipes,
    });
    if (authUser) {
      await safeSupabaseUpsert(
        "recipes",
        [
          {
            ...recipe,
            user_id:
              authUser.id,
          },
        ]
      );
    }
    setSaving(false);
    setScreen("author");
  } catch (error) {
    console.log(
      "SAVE RECIPE ERROR:",
      error
    );
    setSaving(false);
    if (
      typeof window !== "undefined" &&
      window.alert
    ) {
      window.alert(
        "Не удалось сохранить рецепт: " +
          String(
            error?.message ||
              error
          )
      );
    } else {
      Alert.alert(
        "Ошибка",
        "Не удалось сохранить рецепт."
      );
    }
  }
}
async function removeRecipe(
  recipe
) {
  if (!recipe) {
    return;
  }
  const recipeId =
    recipe.id;
  const title =
    recipe.title ||
    recipe.name ||
    "Рецепт";
  const confirmed =
    await confirmDelete(
      `Удалить рецепт «${title}»?`
    );
  if (!confirmed) {
    return;
  }
  const recipesArray =
    Array.isArray(recipes)
      ? recipes
      : [];
  const nextRecipes =
    recipesArray.filter(
      (item) =>
        String(item?.id) !==
        String(recipeId)
    );
  const deletedArray =
    Array.isArray(
      deletedRecipes
    )
      ? deletedRecipes
      : [];
  const nextDeletedRecipes =
    [
      ...deletedArray,
      recipeId,
    ].filter(
      (value, index, array) =>
        array.findIndex(
          (item) =>
            String(item) ===
            String(value)
        ) === index
    );
  const favoritesArray =
    Array.isArray(
      favorites
    )
      ? favorites
      : [];
  const nextFavorites =
    favoritesArray.filter(
      (id) =>
        String(id) !==
        String(recipeId)
    );
  setRecipes(
    nextRecipes
  );
  setDeletedRecipes(
    nextDeletedRecipes
  );
  setFavorites(
    nextFavorites
  );
  await persistEverything({
    recipes:
      nextRecipes,
    deletedRecipes:
      nextDeletedRecipes,
    favorites:
      nextFavorites,
  });
  if (authUser) {
    await safeSupabaseDelete(
      "recipes",
      recipeId
    );
  }
  if (
    String(selectedRecipeId) ===
    String(recipeId)
  ) {
    setSelectedRecipeId(
      null
    );
  }
  if (
    String(editingRecipeId) ===
    String(recipeId)
  ) {
    setEditingRecipeId(
      null
    );
  }
}
// ============================================================
// LOCAL RESET
// ============================================================
async function resetLocalData() {
  const confirmed =
    await confirmDelete(
      "Сбросить локальные данные PaCook? Авторские изменения, избранное и дневник на этом устройстве будут удалены."
    );
  if (!confirmed) {
    return;
  }
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.data,
      STORAGE_KEYS.profile,
      STORAGE_KEYS.settings,
      // Удаляем и старые ключи,
      // которые могли остаться от предыдущей версии.
      "PACOOK_PRODUCTS",
      "PACOOK_RECIPES",
      "PACOOK_PROFILE",
      "PACOOK_SETTINGS",
    ]);
  } catch (error) {
    console.log(
      "RESET ERROR",
      error
    );
  }
  const resetProducts =
    ensureProductsArray(
      ALL_INITIAL_PRODUCTS
    );
  const resetRecipes =
    normalizeRecipes(
      INITIAL_RECIPES
    );
  setProducts(
    resetProducts
  );
  setRecipes(
    resetRecipes
  );
  setFavorites([]);
  setDiary([]);
  setDeletedProducts([]);
  setDeletedRecipes([]);
  const resetProfile = {
    name:
      authUser?.user_metadata?.name ||
      "PaCook User",
    username:
      "",
    bio:
      "",
    avatar:
      "",
    photo:
      "",
    avatarUrl:
      "",
    city:
      "",
    age:
      "",
    goal:
      "",
  };
  setProfile(
    resetProfile
  );
  setProfileForm(
    resetProfile
  );
  const resetSettings = {
    ...DEFAULT_SETTINGS,
    diaryTargets:
      {},
  };
  setSettings(
    resetSettings
  );
  setDiaryTarget(
    "2000"
  );
  setEditingProductName(
    null
  );
  setEditingRecipeId(
    null
  );
  setEditingDiaryId(
    null
  );
  setDiaryRecipeId(
    ""
  );
  setDiaryTime(
    ""
  );
  setAuthorMode(
    false
  );
  setScreen(
    "home"
  );
}

  // ============================================================
// AUTH SCREEN
// ============================================================
function renderAuthScreen() {
  const isSignup =
    authMode === "signup";
  return (
    <SafeAreaView
      style={styles.safe}
    >
      <ScrollView
        contentContainerStyle={
          styles.authContainer
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.authLogo}
        >
          <Text
            style={
              styles.authLogoEmoji
            }
          >
            👨‍🍳
          </Text>
        </View>
        <Text
          style={styles.authTitle}
        >
          PaCook
        </Text>
        <Text
          style={
            styles.authSubtitle
          }
        >
          Cook smart. Eat better.
        </Text>
        <View
          style={styles.authCard}
        >
          <Text
            style={
              styles.authCardTitle
            }
          >
            {isSignup
              ? "Создать аккаунт"
              : "Войти в аккаунт"}
          </Text>
          {isSignup && (
            <FormInput
              label="Имя"
              value={
                String(
                  authNameState || ""
                )
              }
              onChangeText={
                setAuthNameState
              }
              placeholder="Твоё имя"
              autoCapitalize="words"
            />
          )}
          <FormInput
            label="Email"
            value={
              String(
                authEmailState || ""
              )
            }
            onChangeText={
              setAuthEmailState
            }
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FormInput
            label="Пароль"
            value={
              String(
                authPasswordState || ""
              )
            }
            onChangeText={
              setAuthPasswordState
            }
            placeholder="Минимум 6 символов"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {renderAuthError()}
          <PrimaryButton
            title={
              authLoading
                ? "Загрузка..."
                : isSignup
                ? "Создать аккаунт"
                : "Войти"
            }
            onPress={
              handleAuthSubmit
            }
            disabled={
              authLoading
            }
          />
          <TouchableOpacity
            style={
              styles.authSwitch
            }
            activeOpacity={0.7}
            onPress={() => {
              if (authLoading) {
                return;
              }
              setAuthError("");
              setAuthMode(
                isSignup
                  ? "login"
                  : "signup"
              );
            }}
          >
            <Text
              style={
                styles.authSwitchText
              }
            >
              {isSignup
                ? "Уже есть аккаунт? Войти"
                : "Нет аккаунта? Зарегистрироваться"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
// ============================================================
// BOTTOM NAVIGATION
// ============================================================
function renderBottomNavigation() {
  const items = [
    {
      id: "home",
      icon: "⌂",
      title: "Главная",
    },
    {
      id: "recipes",
      icon: "🍽️",
      title: "Рецепты",
    },
    {
      id: "products",
      icon: "🥕",
      title: "Продукты",
    },
    {
      id: "diary",
      icon: "📅",
      title: "Дневник",
    },
    {
      id: "profile",
      icon: "👤",
      title: "Профиль",
    },
  ];
  return (
    <View
      style={
        styles.bottomNavigation
      }
    >
      {items.map((item) => {
        const active =
          screen === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              setScreen(
                item.id
              );
            }}
            style={[
              styles.bottomNavItem,
              active &&
                styles.bottomNavItemActive,
            ]}
          >
            <Text
              style={[
                styles.bottomNavIcon,
                active &&
                  styles.bottomNavIconActive,
              ]}
            >
              {item.icon}
            </Text>
            <Text
              style={[
                styles.bottomNavText,
                active &&
                  styles.bottomNavTextActive,
              ]}
            >
              {item.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
// ============================================================
// MAIN SCREEN SWITCH
// ============================================================
if (
  !authChecked ||
  loadingData
) {
  return (
    <SafeAreaView
      style={
        styles.loadingScreen
      }
    >
      <View
        style={
          styles.loadingLogo
        }
      >
        <Text
          style={
            styles.loadingEmoji
          }
        >
          👨‍🍳
        </Text>
        <Text
          style={
            styles.loadingTitle
          }
        >
          PaCook
        </Text>
        <Text
          style={
            styles.loadingText
          }
        >
          Загружаем приложение...
        </Text>
      </View>
    </SafeAreaView>
  );
}
// ============================================================
// AUTH
// ============================================================
if (
  screen === "auth"
) {
  return renderAuthScreen();
}
// ============================================================
// PROFILE
// ============================================================
if (
  screen === "profile"
) {
  return (
    <SafeAreaView
      style={styles.safe}
    >
      {renderProfileScreen()}
      {renderBottomNavigation()}
    </SafeAreaView>
  );
}
// ============================================================
// PROFILE EDIT
// ============================================================
if (
  screen === "profileEdit"
) {
  return (
    <SafeAreaView
      style={styles.safe}
    >
      {renderProfileEditScreen()}
    </SafeAreaView>
  );
}
// ============================================================
// AUTHOR
// ============================================================
if (
  screen === "author"
) {
  return (
    <SafeAreaView
      style={styles.safe}
    >
      {renderAuthorScreen()}
    </SafeAreaView>
  );
}
// ============================================================
// AUTHOR PRODUCT
// ============================================================
if (
  screen === "authorProduct"
) {
  return (
    <SafeAreaView
      style={styles.safe}
    >
      {renderAuthorProductScreen()}
    </SafeAreaView>
  );
}
// ============================================================
// AUTHOR RECIPE
// ============================================================
if (
  screen === "authorRecipe"
) {
  return (
    <SafeAreaView
      style={styles.safe}
    >
      {renderAuthorRecipeScreen()}
    </SafeAreaView>
  );
}
// ============================================================
// SETTINGS
// ============================================================
if (
  screen === "settings"
) {
  return (
    <SafeAreaView
      style={styles.safe}
    >
      {renderSettingsScreen()}
    </SafeAreaView>
  );
}

  // ============================================================
// DEFAULT APP
// ============================================================
return (
  <SafeAreaView
    style={styles.safe}
  >
    <View
      style={styles.appContainer}
    >
      {screen === "home" &&
        renderHomeScreen()}
      {screen === "recipes" &&
        renderRecipesScreen()}
      {screen === "products" &&
        renderProductsScreen()}
      {screen === "recipe" &&
        renderRecipeDetailScreen()}
      {screen === "recipeDetail" &&
        renderRecipeDetailScreen()}
      {screen === "favorites" &&
        renderFavoritesScreen()}
      {screen === "diary" &&
        renderDiaryScreen()}
      {renderBottomNavigation()}
    </View>
  </SafeAreaView>
);

  // ============================================================
  // STYLES
  // ============================================================
 
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F4EC",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F7F4EC",
  },
  appContainer: {
    flex: 1,
    backgroundColor: "#F7F4EC",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
  },
  bottomSpacer: {
    height: 40,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#F7F4EC",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    alignItems: "center",
  },
  loadingEmoji: {
    fontSize: 58,
    marginBottom: 12,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#345C48",
    letterSpacing: -1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#7A817C",
  },
  simpleTopBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  simpleTopTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D2922",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFDF8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E6E1D6",
  },
  backButtonText: {
    fontSize: 30,
    lineHeight: 32,
    color: "#345C48",
    marginTop: -2,
  },
  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------
  authContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 50,
    justifyContent: "center",
  },
  authLogo: {
    alignItems: "center",
    marginBottom: 28,
  },
  authLogoEmoji: {
    fontSize: 58,
    lineHeight: 64,
    textAlign: "center",
  },
  authLogoText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#345C48",
    letterSpacing: -1.5,
  },
  authLogoSubtitle: {
    marginTop: 5,
    color: "#7A817C",
    fontSize: 14,
  },
  authCard: {
    backgroundColor: "#FFFDF8",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E6E1D6",
  },
  authTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1D2922",
    marginBottom: 6,
  },
  authSubtitle: {
    color: "#7A817C",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  authSwitch: {
    alignItems: "center",
    paddingVertical: 16,
  },
  authSwitchText: {
    color: "#345C48",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  authBackHome: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
  authBackHomeText: {
    color: "#7A817C",
    fontSize: 13,
  },
  authFooter: {
    textAlign: "center",
    color: "#7A817C",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 20,
    paddingHorizontal: 12,
  },
  authErrorBox: {
    backgroundColor: "#FBE9E7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E9B7B3",
  },
  authErrorText: {
    color: "#B94A48",
    fontSize: 13,
    lineHeight: 18,
  },
  // ----------------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------------
  settingsCard: {
    backgroundColor: "#FFFDF8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6E1D6",
    overflow: "hidden",
    marginBottom: 22,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E5EEE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingMain: {
    flex: 1,
  },
  settingTitle: {
    color: "#1D2922",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  settingText: {
    color: "#7A817C",
    fontSize: 12,
    lineHeight: 17,
  },
  settingDivider: {
    height: 1,
    backgroundColor: "#E6E1D6",
    marginLeft: 70,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D8D5CC",
    padding: 3,
    justifyContent: "center",
  },
  switchActive: {
    backgroundColor: "#527966",
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFDF8",
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  settingsAction: {
    backgroundColor: "#FFFDF8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6E1D6",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  settingsActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FBE9E7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingsActionTitle: {
    color: "#1D2922",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  menuArrow: {
    fontSize: 28,
    color: "#7A817C",
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: "#E5EEE7",
    borderRadius: 20,
    padding: 18,
    marginTop: 4,
  },
  infoCardTitle: {
    color: "#345C48",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  infoCardText: {
    color: "#527966",
    fontSize: 13,
    lineHeight: 21,
  },
  // ----------------------------------------------------------
  // BOTTOM NAV
  // ----------------------------------------------------------
  bottomNavigation: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E6E1D6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  bottomNavItem: {
    flex: 1,
    height: 58,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  bottomNavItemActive: {
    backgroundColor: "#E5EEE7",
  },
  bottomNavIcon: {
    fontSize: 20,
    marginBottom: 3,
    opacity: 0.65,
  },
  bottomNavIconActive: {
    opacity: 1,
  },
  bottomNavText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7A817C",
  },
  bottomNavTextActive: {
    color: "#345C48",
    fontWeight: "800",
  },
  // ----------------------------------------------------------
  // COMMON
  // ----------------------------------------------------------
  sectionTitle: {
    color: "#1D2922",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderTitle: {
    color: "#1D2922",
    fontSize: 20,
    fontWeight: "800",
  },
  sectionHeaderAction: {
    color: "#527966",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFDF8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6E1D6",
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#345C48",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#E5EEE7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#D4E2D8",
  },
  secondaryButtonText: {
    color: "#345C48",
    fontSize: 14,
    fontWeight: "800",
  },
  formInput: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E6E1D6",
    paddingHorizontal: 14,
    color: "#1D2922",
    fontSize: 15,
    marginBottom: 14,
  },
  formLabel: {
    color: "#1D2922",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E1D6",
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#1D2922",
    fontSize: 14,
  },
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E6E1D6",
    marginRight: 8,
    marginBottom: 8,
  },
  pillActive: {
    backgroundColor: "#345C48",
    borderColor: "#345C48",
  },
  pillText: {
    color: "#7A817C",
    fontSize: 12,
    fontWeight: "700",
  },
    pillTextActive: {
    color: "#FFFFFF",
  },
  emptyState: {
    backgroundColor: "#FFFDF8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6E1D6",
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  emptyStateIcon: {
    fontSize: 38,
    marginBottom: 10,
  },
  emptyStateTitle: {
    color: "#1D2922",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyStateText: {
    color: "#7A817C",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
});