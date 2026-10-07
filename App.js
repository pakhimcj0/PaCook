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
  ActivityIndicator,
  Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = "https://scriqcafjvehyzdpmejf.supabase.co";
const SUPABASE_KEY = "sb_publishable_voMBQUeiNfCUg1luYNo-0Q_VXrRLrNq";
const PACOOK_URL = "https://pacook-ffomnlb4l-pa-cook.vercel.app/";

const RECIPE_BUCKET = "recipe-images";
const PROFILE_BUCKET = "profile-images";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

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
  red: "#B94A48"
};

const INITIAL_PRODUCTS = {
  "Творог 5%": {
    kcal: 121,
    protein: 17,
    fat: 5,
    carbs: 2
  },
  "Творог 2%": {
    kcal: 103,
    protein: 18,
    fat: 2,
    carbs: 3
  },
  "Творог 0%": {
    kcal: 71,
    protein: 16,
    fat: 0.2,
    carbs: 1.8
  },
  "Греческий йогурт": {
    kcal: 73,
    protein: 10,
    fat: 2,
    carbs: 4
  },
  "Йогурт натуральный 2%": {
    kcal: 60,
    protein: 4.5,
    fat: 2,
    carbs: 6
  },
  "Молоко 2.5%": {
    kcal: 52,
    protein: 3,
    fat: 2.5,
    carbs: 4.7
  },
  "Молоко 1.5%": {
    kcal: 44,
    protein: 3,
    fat: 1.5,
    carbs: 4.7
  },
  "Кефир 1%": {
    kcal: 40,
    protein: 3,
    fat: 1,
    carbs: 4
  },
  "Кефир 2.5%": {
    kcal: 53,
    protein: 3,
    fat: 2.5,
    carbs: 4
  },
  "Ряженка 2.5%": {
    kcal: 54,
    protein: 2.9,
    fat: 2.5,
    carbs: 4.2
  },
  "Сметана 15%": {
    kcal: 158,
    protein: 2.6,
    fat: 15,
    carbs: 3.6
  },
  "Сливки 10%": {
    kcal: 118,
    protein: 3,
    fat: 10,
    carbs: 4
  },
  "Яйцо": {
    kcal: 157,
    protein: 13,
    fat: 11,
    carbs: 1.1
  },
  "Белок яйца": {
    kcal: 52,
    protein: 11,
    fat: 0.2,
    carbs: 0.7
  },
  "Желток": {
    kcal: 322,
    protein: 16,
    fat: 27,
    carbs: 3.6
  },
  "Сыр моцарелла": {
    kcal: 280,
    protein: 28,
    fat: 17,
    carbs: 3
  },
  "Сыр чеддер": {
    kcal: 403,
    protein: 25,
    fat: 33,
    carbs: 1.3
  },
  "Сыр гауда": {
    kcal: 356,
    protein: 25,
    fat: 27,
    carbs: 2.2
  },
  "Сыр фета": {
    kcal: 264,
    protein: 14,
    fat: 21,
    carbs: 4.1
  },
  "Пармезан": {
    kcal: 392,
    protein: 35.8,
    fat: 25.8,
    carbs: 3.2
  },
  "Овсянка": {
    kcal: 366,
    protein: 12,
    fat: 6,
    carbs: 60
  },
  "Гречка": {
    kcal: 343,
    protein: 13,
    fat: 3.4,
    carbs: 72
  },
  "Рис": {
    kcal: 344,
    protein: 6.7,
    fat: 0.7,
    carbs: 78
  },
  "Рис басмати": {
    kcal: 347,
    protein: 7.5,
    fat: 0.6,
    carbs: 78
  },
  "Рисовая мука": {
    kcal: 366,
    protein: 6,
    fat: 1,
    carbs: 80
  },
  "Пшеничная мука": {
    kcal: 334,
    protein: 10,
    fat: 1,
    carbs: 70
  },
  "Цельнозерновая мука": {
    kcal: 340,
    protein: 13,
    fat: 2.5,
    carbs: 62
  },
  "Кукурузная мука": {
    kcal: 331,
    protein: 7.2,
    fat: 1.5,
    carbs: 72
  },
  "Гречневая мука": {
    kcal: 335,
    protein: 13.6,
    fat: 3.1,
    carbs: 71
  },
  "Миндальная мука": {
    kcal: 570,
    protein: 21,
    fat: 50,
    carbs: 10
  },
  "Кокосовая мука": {
    kcal: 443,
    protein: 19,
    fat: 13,
    carbs: 60
  },
  "Манка": {
    kcal: 333,
    protein: 10.3,
    fat: 1,
    carbs: 70
  },
  "Булгур": {
    kcal: 342,
    protein: 12.3,
    fat: 1.3,
    carbs: 75.9
  },
  "Киноа": {
    kcal: 368,
    protein: 14.1,
    fat: 6.1,
    carbs: 64.2
  },
  "Кускус": {
    kcal: 376,
    protein: 12.8,
    fat: 0.6,
    carbs: 77.4
  },
  "Перловка": {
    kcal: 324,
    protein: 9.3,
    fat: 1.1,
    carbs: 73.7
  },
  "Пшено": {
    kcal: 342,
    protein: 11.5,
    fat: 3.3,
    carbs: 66.5
  },
  "Макароны": {
    kcal: 350,
    protein: 12,
    fat: 1.5,
    carbs: 70
  },
  "Макароны цельнозерновые": {
    kcal: 348,
    protein: 13,
    fat: 2.5,
    carbs: 65
  },
  "Рисовые хлебцы": {
    kcal: 387,
    protein: 8,
    fat: 3,
    carbs: 81
  },
  "Куриная грудка": {
    kcal: 110,
    protein: 23,
    fat: 1.9,
    carbs: 0
  },
  "Куриное бедро без кожи": {
    kcal: 144,
    protein: 18,
    fat: 8,
    carbs: 0
  },
  "Куриное бедро с кожей": {
    kcal: 209,
    protein: 17,
    fat: 15,
    carbs: 0
  },
  "Индейка": {
    kcal: 114,
    protein: 23,
    fat: 2,
    carbs: 0
  },
  "Филе индейки": {
    kcal: 114,
    protein: 23,
    fat: 2,
    carbs: 0
  },
  "Говядина постная": {
    kcal: 187,
    protein: 26,
    fat: 9,
    carbs: 0
  },
  "Телятина": {
    kcal: 172,
    protein: 20,
    fat: 9,
    carbs: 0
  },
  "Свинина постная": {
    kcal: 242,
    protein: 27,
    fat: 14,
    carbs: 0
  },
  "Свинина вырезка": {
    kcal: 143,
    protein: 21,
    fat: 6,
    carbs: 0
  },
  "Фарш говяжий 10%": {
    kcal: 176,
    protein: 26,
    fat: 8,
    carbs: 0
  },
  "Фарш куриный": {
    kcal: 143,
    protein: 17,
    fat: 8,
    carbs: 0
  },
  "Фарш индейки": {
    kcal: 150,
    protein: 19,
    fat: 8,
    carbs: 0
  },
  "Кролик": {
    kcal: 173,
    protein: 21,
    fat: 10,
    carbs: 0
  },
  "Печень куриная": {
    kcal: 136,
    protein: 20,
    fat: 6,
    carbs: 1
  },
  "Печень говяжья": {
    kcal: 135,
    protein: 20.4,
    fat: 3.6,
    carbs: 3.9
  },
  "Сердце куриное": {
    kcal: 153,
    protein: 15.6,
    fat: 10.3,
    carbs: 0.7
  },
  "Лосось": {
    kcal: 208,
    protein: 20,
    fat: 13,
    carbs: 0
  },
  "Форель": {
    kcal: 148,
    protein: 20.5,
    fat: 6.5,
    carbs: 0
  },
  "Тунец": {
    kcal: 132,
    protein: 29,
    fat: 1,
    carbs: 0
  },
  "Треска": {
    kcal: 82,
    protein: 18,
    fat: 0.7,
    carbs: 0
  },
  "Хек": {
    kcal: 86,
    protein: 16.6,
    fat: 2.2,
    carbs: 0
  },
  "Минтай": {
    kcal: 72,
    protein: 15.9,
    fat: 0.9,
    carbs: 0
  },
  "Судак": {
    kcal: 84,
    protein: 19.2,
    fat: 0.7,
    carbs: 0
  },
  "Скумбрия": {
    kcal: 191,
    protein: 18,
    fat: 13.2,
    carbs: 0
  },
  "Креветки": {
    kcal: 99,
    protein: 24,
    fat: 0.3,
    carbs: 0.2
  },
  "Кальмар": {
    kcal: 92,
    protein: 18,
    fat: 1.4,
    carbs: 2
  },
  "Мидии": {
    kcal: 86,
    protein: 12,
    fat: 2.2,
    carbs: 3.7
  },
  "Крабовые палочки": {
    kcal: 95,
    protein: 7,
    fat: 1,
    carbs: 15
  },
  "Картофель": {
    kcal: 77,
    protein: 2,
    fat: 0.1,
    carbs: 17
  },
  "Батат": {
    kcal: 86,
    protein: 1.6,
    fat: 0.1,
    carbs: 20
  },
  "Морковь": {
    kcal: 35,
    protein: 1.3,
    fat: 0.1,
    carbs: 6.9
  },
  "Свёкла": {
    kcal: 43,
    protein: 1.6,
    fat: 0.2,
    carbs: 9.6
  },
  "Капуста белокочанная": {
    kcal: 27,
    protein: 1.8,
    fat: 0.1,
    carbs: 4.7
  },
  "Брокколи": {
    kcal: 34,
    protein: 2.8,
    fat: 0.4,
    carbs: 6.6
  },
  "Цветная капуста": {
    kcal: 25,
    protein: 1.9,
    fat: 0.3,
    carbs: 5
  },
  "Кабачок": {
    kcal: 24,
    protein: 0.6,
    fat: 0.3,
    carbs: 4.6
  },
  "Цукини": {
    kcal: 17,
    protein: 1.2,
    fat: 0.3,
    carbs: 3.1
  },
  "Огурец": {
    kcal: 15,
    protein: 0.8,
    fat: 0.1,
    carbs: 3
  },
  "Помидор": {
    kcal: 18,
    protein: 0.9,
    fat: 0.2,
    carbs: 3.9
  },
  "Черри": {
    kcal: 18,
    protein: 0.9,
    fat: 0.2,
    carbs: 3.9
  },
  "Болгарский перец": {
    kcal: 27,
    protein: 1,
    fat: 0.2,
    carbs: 6.3
  },
  "Шпинат": {
    kcal: 23,
    protein: 2.9,
    fat: 0.4,
    carbs: 3.6
  },
  "Салат айсберг": {
    kcal: 14,
    protein: 0.9,
    fat: 0.1,
    carbs: 3
  },
  "Руккола": {
    kcal: 25,
    protein: 2.6,
    fat: 0.7,
    carbs: 3.7
  },
  "Баклажан": {
    kcal: 24,
    protein: 1,
    fat: 0.2,
    carbs: 5.5
  },
  "Тыква": {
    kcal: 26,
    protein: 1,
    fat: 0.1,
    carbs: 6.5
  },
  "Лук репчатый": {
    kcal: 41,
    protein: 1.4,
    fat: 0.2,
    carbs: 10
  },
  "Чеснок": {
    kcal: 149,
    protein: 6.4,
    fat: 0.5,
    carbs: 33
  },
  "Зелёный горошек": {
    kcal: 73,
    protein: 5,
    fat: 0.4,
    carbs: 14
  },
  "Кукуруза": {
    kcal: 86,
    protein: 3.4,
    fat: 1.5,
    carbs: 19
  },
  "Стручковая фасоль": {
    kcal: 31,
    protein: 1.8,
    fat: 0.2,
    carbs: 7
  },
  "Грибы шампиньоны": {
    kcal: 27,
    protein: 3.1,
    fat: 0.3,
    carbs: 3.3
  },
  "Банан": {
    kcal: 89,
    protein: 1.1,
    fat: 0.3,
    carbs: 23
  },
  "Яблоко": {
    kcal: 52,
    protein: 0.3,
    fat: 0.2,
    carbs: 14
  },
  "Груша": {
    kcal: 57,
    protein: 0.4,
    fat: 0.1,
    carbs: 15
  },
  "Апельсин": {
    kcal: 47,
    protein: 0.9,
    fat: 0.1,
    carbs: 11.8
  },
  "Мандарин": {
    kcal: 53,
    protein: 0.8,
    fat: 0.3,
    carbs: 13.3
  },
  "Лимон": {
    kcal: 29,
    protein: 1.1,
    fat: 0.3,
    carbs: 9.3
  },
  "Грейпфрут": {
    kcal: 42,
    protein: 0.8,
    fat: 0.1,
    carbs: 10.7
  },
  "Киви": {
    kcal: 61,
    protein: 1.1,
    fat: 0.5,
    carbs: 14.7
  },
  "Персик": {
    kcal: 39,
    protein: 0.9,
    fat: 0.3,
    carbs: 9.5
  },
  "Нектарин": {
    kcal: 44,
    protein: 1.1,
    fat: 0.3,
    carbs: 10.6
  },
  "Абрикос": {
    kcal: 48,
    protein: 1.4,
    fat: 0.4,
    carbs: 11.1
  },
  "Слива": {
    kcal: 46,
    protein: 0.7,
    fat: 0.3,
    carbs: 11.4
  },
  "Виноград": {
    kcal: 69,
    protein: 0.7,
    fat: 0.2,
    carbs: 18
  },
  "Ананас": {
    kcal: 50,
    protein: 0.5,
    fat: 0.1,
    carbs: 13.1
  },
  "Манго": {
    kcal: 60,
    protein: 0.8,
    fat: 0.4,
    carbs: 15
  },
  "Арбуз": {
    kcal: 30,
    protein: 0.6,
    fat: 0.2,
    carbs: 7.6
  },
  "Дыня": {
    kcal: 34,
    protein: 0.8,
    fat: 0.2,
    carbs: 8.2
  },
  "Клубника": {
    kcal: 32,
    protein: 0.7,
    fat: 0.3,
    carbs: 7.7
  },
  "Малина": {
    kcal: 52,
    protein: 1.2,
    fat: 0.7,
    carbs: 12
  },
  "Черника": {
    kcal: 57,
    protein: 0.7,
    fat: 0.3,
    carbs: 14
  },
  "Ежевика": {
    kcal: 43,
    protein: 1.4,
    fat: 0.5,
    carbs: 9.6
  },
  "Смородина чёрная": {
    kcal: 44,
    protein: 1,
    fat: 0.4,
    carbs: 7.3
  },
  "Вишня": {
    kcal: 50,
    protein: 1,
    fat: 0.3,
    carbs: 12
  },
  "Черешня": {
    kcal: 63,
    protein: 1.1,
    fat: 0.4,
    carbs: 16
  },
  "Гранат": {
    kcal: 83,
    protein: 1.7,
    fat: 1.2,
    carbs: 18.7
  },
  "Авокадо": {
    kcal: 160,
    protein: 2,
    fat: 15,
    carbs: 9
  },
  "Оливковое масло": {
    kcal: 884,
    protein: 0,
    fat: 100,
    carbs: 0
  },
  "Подсолнечное масло": {
    kcal: 899,
    protein: 0,
    fat: 99.9,
    carbs: 0
  },
  "Сливочное масло": {
    kcal: 748,
    protein: 0.5,
    fat: 82.5,
    carbs: 0.8
  },
  "Арахисовая паста": {
    kcal: 588,
    protein: 25,
    fat: 50,
    carbs: 20
  },
  "Миндаль": {
    kcal: 579,
    protein: 21,
    fat: 49,
    carbs: 22
  },
  "Грецкий орех": {
    kcal: 654,
    protein: 15,
    fat: 65,
    carbs: 14
  },
  "Кешью": {
    kcal: 553,
    protein: 18,
    fat: 44,
    carbs: 30
  },
  "Фисташки": {
    kcal: 562,
    protein: 20,
    fat: 45,
    carbs: 28
  },
  "Фундук": {
    kcal: 628,
    protein: 15,
    fat: 61,
    carbs: 17
  },
  "Семена чиа": {
    kcal: 486,
    protein: 17,
    fat: 31,
    carbs: 42
  },
  "Льняное семя": {
    kcal: 534,
    protein: 18,
    fat: 42,
    carbs: 29
  },
  "Семечки подсолнечника": {
    kcal: 584,
    protein: 21,
    fat: 51,
    carbs: 20
  },
  "Кунжут": {
    kcal: 573,
    protein: 18,
    fat: 50,
    carbs: 23
  },
  "Какао": {
    kcal: 228,
    protein: 20,
    fat: 14,
    carbs: 58
  },
  "Кокосовая стружка": {
    kcal: 660,
    protein: 7,
    fat: 65,
    carbs: 24
  },
  "Мёд": {
    kcal: 304,
    protein: 0.3,
    fat: 0,
    carbs: 82
  },
  "Сахар": {
    kcal: 387,
    protein: 0,
    fat: 0,
    carbs: 100
  },
  "Сахарная пудра": {
    kcal: 389,
    protein: 0,
    fat: 0,
    carbs: 100
  },
  "Кленовый сироп": {
    kcal: 260,
    protein: 0,
    fat: 0,
    carbs: 67
  },
  "Изюм": {
    kcal: 299,
    protein: 3.1,
    fat: 0.5,
    carbs: 79
  },
  "Курага": {
    kcal: 241,
    protein: 3.4,
    fat: 0.5,
    carbs: 63
  },
  "Финики": {
    kcal: 282,
    protein: 2.5,
    fat: 0.4,
    carbs: 75
  },
  "Чернослив": {
    kcal: 240,
    protein: 2.2,
    fat: 0.4,
    carbs: 64
  },
  "Шоколад тёмный 70%": {
    kcal: 598,
    protein: 7.8,
    fat: 42.6,
    carbs: 45.9
  },
  "Шоколад молочный": {
    kcal: 535,
    protein: 7.7,
    fat: 30.7,
    carbs: 59.4
  },
  "Хлеб цельнозерновой": {
    kcal: 247,
    protein: 13,
    fat: 4.2,
    carbs: 41
  },
  "Хлеб ржаной": {
    kcal: 214,
    protein: 6.6,
    fat: 1.2,
    carbs: 40
  },
  "Хлеб белый": {
    kcal: 265,
    protein: 8.5,
    fat: 3.2,
    carbs: 49
  },
  "Лаваш": {
    kcal: 277,
    protein: 9.1,
    fat: 1.2,
    carbs: 56
  },
  "Тортилья пшеничная": {
    kcal: 312,
    protein: 8.3,
    fat: 8.3,
    carbs: 52
  },
  "Хлебцы цельнозерновые": {
    kcal: 340,
    protein: 10,
    fat: 2.5,
    carbs: 65
  },
  "Крекер цельнозерновой": {
    kcal: 430,
    protein: 9,
    fat: 15,
    carbs: 65
  },
  "Чечевица сухая": {
    kcal: 352,
    protein: 24.6,
    fat: 1.1,
    carbs: 63
  },
  "Нут сухой": {
    kcal: 364,
    protein: 19,
    fat: 6,
    carbs: 61
  },
  "Фасоль красная сухая": {
    kcal: 333,
    protein: 24,
    fat: 1.5,
    carbs: 60
  },
  "Горох сухой": {
    kcal: 298,
    protein: 20.5,
    fat: 2,
    carbs: 49
  },
  "Тофу": {
    kcal: 76,
    protein: 8,
    fat: 4.8,
    carbs: 0.7
  },
  "Соевое молоко": {
    kcal: 33,
    protein: 2.9,
    fat: 1.8,
    carbs: 0.7
  },
  "Кетчуп": {
    kcal: 112,
    protein: 1.8,
    fat: 0.2,
    carbs: 25
  },
  "Горчица": {
    kcal: 66,
    protein: 4,
    fat: 4,
    carbs: 5
  },
  "Соевый соус": {
    kcal: 53,
    protein: 8,
    fat: 0.6,
    carbs: 4.9
  },
  "Томатная паста": {
    kcal: 82,
    protein: 4.3,
    fat: 0.5,
    carbs: 18
  },
  "Майонез": {
    kcal: 627,
    protein: 1,
    fat: 67,
    carbs: 3.7
  },
  "Уксус яблочный": {
    kcal: 21,
    protein: 0,
    fat: 0,
    carbs: 0.9
  },
  "Ванилин": {
    kcal: 288,
    protein: 0.1,
    fat: 0.1,
    carbs: 12.7
  },
  "Разрыхлитель": {
    kcal: 53,
    protein: 0,
    fat: 0,
    carbs: 28
  },
  "Корица": {
    kcal: 247,
    protein: 4,
    fat: 1.2,
    carbs: 81
  },
  "Желатин": {
    kcal: 335,
    protein: 85.6,
    fat: 0.1,
    carbs: 0
  },
  "Крахмал кукурузный": {
    kcal: 381,
    protein: 0.3,
    fat: 0.1,
    carbs: 91
  },
  "Кокосовое молоко": {
    kcal: 230,
    protein: 2.3,
    fat: 24,
    carbs: 3.3
  }
};

const INITIAL_RECIPES = [
  {
    id: "1",
    title: "Кремовые сырники",
    category: "Завтраки",
    time: 20,
    servings: 2,
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1000",
    description: "Нежные сырники с высокой долей белка.",
    ingredients: [
      { product: "Творог 5%", grams: 200 },
      { product: "Яйцо", grams: 50 },
      { product: "Рисовая мука", grams: 30 },
      { product: "Мёд", grams: 5 }
    ],
    steps: [
      "Протри творог.",
      "Добавь яйцо и муку.",
      "Сформируй сырники.",
      "Обжарь на слабом огне до готовности."
    ]
  },

  {
    id: "2",
    title: "Овсяноблин с бананом",
    category: "Завтраки",
    time: 10,
    servings: 1,
    image: "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=1000",
    description: "Быстрый завтрак с бананом.",
    ingredients: [
      { product: "Овсянка", grams: 50 },
      { product: "Яйцо", grams: 50 },
      { product: "Банан", grams: 80 },
      { product: "Греческий йогурт", grams: 50 }
    ],
    steps: [
      "Измельчи овсянку.",
      "Смешай с яйцом.",
      "Обжарь с двух сторон.",
      "Подавай с бананом и йогуртом."
    ]
  },

  {
    id: "3",
    title: "Шоколадный фит-десерт",
    category: "Десерты",
    time: 15,
    servings: 1,
    image: "https://images.unsplash.com/photo-1575377427642-087cf684f29d?w=1000",
    description: "Йогуртовый шоколадный десерт.",
    ingredients: [
      { product: "Греческий йогурт", grams: 150 },
      { product: "Какао", grams: 10 },
      { product: "Мёд", grams: 10 },
      { product: "Банан", grams: 50 }
    ],
    steps: [
      "Смешай йогурт и какао.",
      "Добавь мёд.",
      "Выложи банан.",
      "Охлади 20 минут."
    ]
  },

  {
    id: "4",
    title: "Протеиновая овсянка",
    category: "Завтраки",
    time: 8,
    servings: 1,
    image: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=1000",
    description: "Сытная овсянка для завтрака.",
    ingredients: [
      { product: "Овсянка", grams: 50 },
      { product: "Молоко 2.5%", grams: 150 },
      { product: "Банан", grams: 60 },
      { product: "Арахисовая паста", grams: 10 }
    ],
    steps: [
      "Смешай овсянку с молоком.",
      "Вари до мягкости.",
      "Добавь банан.",
      "Сверху добавь пасту."
    ]
  },

  {
    id: "5",
    title: "Курица с гречкой",
    category: "Обеды",
    time: 30,
    servings: 1,
    image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=1000",
    description: "Простой сбалансированный обед.",
    ingredients: [
      { product: "Куриная грудка", grams: 150 },
      { product: "Гречка", grams: 70 },
      { product: "Оливковое масло", grams: 5 },
      { product: "Огурец", grams: 100 }
    ],
    steps: [
      "Отвари гречку.",
      "Приготовь курицу.",
      "Нарежь овощи.",
      "Собери тарелку."
    ]
  },

  {
    id: "6",
    title: "Творожный крем с ягодами",
    category: "Десерты",
    time: 5,
    servings: 1,
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1000",
    description: "Лёгкий творожный десерт.",
    ingredients: [
      { product: "Творог 5%", grams: 150 },
      { product: "Греческий йогурт", grams: 80 },
      { product: "Малина", grams: 70 },
      { product: "Мёд", grams: 5 }
    ],
    steps: [
      "Пробей творог с йогуртом.",
      "Добавь мёд.",
      "Выложи малину.",
      "Охлади перед подачей."
    ]
  },

  {
    id: "7",
    title: "ПП панкейки",
    category: "Завтраки",
    time: 15,
    servings: 2,
    image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=1000",
    description: "Мягкие панкейки без лишнего сахара.",
    ingredients: [
      { product: "Овсянка", grams: 60 },
      { product: "Яйцо", grams: 50 },
      { product: "Банан", grams: 80 },
      { product: "Греческий йогурт", grams: 80 }
    ],
    steps: [
      "Измельчи овсянку.",
      "Смешай все ингредиенты.",
      "Жарь небольшими порциями."
    ]
  },

  {
    id: "8",
    title: "Боул с курицей",
    category: "Обеды",
    time: 25,
    servings: 1,
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000",
    description: "Большой боул с курицей и овощами.",
    ingredients: [
      { product: "Куриная грудка", grams: 130 },
      { product: "Рис", grams: 70 },
      { product: "Авокадо", grams: 50 },
      { product: "Огурец", grams: 80 },
      { product: "Помидор", grams: 80 }
    ],
    steps: [
      "Приготовь рис.",
      "Обжарь или запеки курицу.",
      "Нарежь овощи.",
      "Собери боул."
    ]
  },

  {
    id: "9",
    title: "ПП синнабоны",
    category: "Десерты",
    time: 45,
    servings: 8,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1000",
    description: "Мягкие булочки с корицей и сладкой начинкой.",
    ingredients: [
      { product: "Пшеничная мука", grams: 250 },
      { product: "Молоко 1.5%", grams: 150 },
      { product: "Яйцо", grams: 50 },
      { product: "Сливочное масло", grams: 35 },
      { product: "Сахар", grams: 45 },
      { product: "Корица", grams: 8 },
      { product: "Разрыхлитель", grams: 6 }
    ],
    steps: [
      "Смешай муку, разрыхлитель и сахар.",
      "Добавь тёплое молоко, яйцо и мягкое масло.",
      "Замеси мягкое тесто.",
      "Раскатай тесто и посыпь сахаром с корицей.",
      "Сверни рулетом и нарежь на 8 частей.",
      "Оставь на 15 минут.",
      "Выпекай при 180°C около 20–25 минут."
    ]
  },

  {
    id: "10",
    title: "Шоколадные сырники",
    category: "Завтраки",
    time: 20,
    servings: 2,
    image: "https://images.unsplash.com/photo-1495214783159-3503fd1b572d?w=1000",
    description: "Нежные шоколадные сырники.",
    ingredients: [
      { product: "Творог 5%", grams: 200 },
      { product: "Яйцо", grams: 50 },
      { product: "Какао", grams: 10 },
      { product: "Рисовая мука", grams: 25 },
      { product: "Сахар", grams: 10 }
    ],
    steps: [
      "Смешай творог, яйцо и какао.",
      "Добавь муку и сахар.",
      "Сформируй сырники.",
      "Обжарь на слабом огне."
    ]
  },

  {
    id: "11",
    title: "Куриная паста",
    category: "Обеды",
    time: 25,
    servings: 2,
    image: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=1000",
    description: "Паста с курицей в лёгком соусе.",
    ingredients: [
      { product: "Макароны цельнозерновые", grams: 140 },
      { product: "Куриная грудка", grams: 180 },
      { product: "Греческий йогурт", grams: 100 },
      { product: "Пармезан", grams: 20 }
    ],
    steps: [
      "Отвари пасту.",
      "Нарежь и приготовь курицу.",
      "Добавь йогурт.",
      "Смешай с пастой.",
      "Посыпь пармезаном."
    ]
  },

  {
    id: "12",
    title: "Омлет с сыром и овощами",
    category: "Завтраки",
    time: 12,
    servings: 1,
    image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=1000",
    description: "Белковый омлет с овощами.",
    ingredients: [
      { product: "Яйцо", grams: 100 },
      { product: "Белок яйца", grams: 100 },
      { product: "Сыр моцарелла", grams: 30 },
      { product: "Помидор", grams: 80 },
      { product: "Шпинат", grams: 30 }
    ],
    steps: [
      "Взбей яйца и белки.",
      "Добавь овощи.",
      "Вылей смесь на сковороду.",
      "Добавь сыр.",
      "Готовь под крышкой."
    ]
  },

  {
    id: "13",
    title: "Творожная запеканка",
    category: "Завтраки",
    time: 40,
    servings: 4,
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1000",
    description: "Нежная творожная запеканка.",
    ingredients: [
      { product: "Творог 5%", grams: 500 },
      { product: "Яйцо", grams: 100 },
      { product: "Манка", grams: 40 },
      { product: "Греческий йогурт", grams: 100 },
      { product: "Мёд", grams: 20 }
    ],
    steps: [
      "Смешай творог с яйцами.",
      "Добавь манку и йогурт.",
      "Подсласти мёдом.",
      "Переложи в форму.",
      "Выпекай при 180°C около 30 минут."
    ]
  },

  {
    id: "14",
    title: "Лаваш с курицей",
    category: "Обеды",
    time: 15,
    servings: 1,
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1000",
    description: "Быстрый домашний ролл с курицей.",
    ingredients: [
      { product: "Лаваш", grams: 70 },
      { product: "Куриная грудка", grams: 120 },
      { product: "Огурец", grams: 60 },
      { product: "Помидор", grams: 60 },
      { product: "Греческий йогурт", grams: 40 }
    ],
    steps: [
      "Приготовь курицу.",
      "Нарежь овощи.",
      "Смажь лаваш йогуртом.",
      "Добавь начинку.",
      "Сверни ролл."
    ]
  },

  {
    id: "15",
    title: "Овсяное печенье с бананом",
    category: "Десерты",
    time: 25,
    servings: 6,
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=1000",
    description: "Простое домашнее печенье из овсянки и банана.",
    ingredients: [
      { product: "Овсянка", grams: 120 },
      { product: "Банан", grams: 150 },
      { product: "Арахисовая паста", grams: 20 },
      { product: "Корица", grams: 3 }
    ],
    steps: [
      "Разомни банан.",
      "Добавь овсянку и пасту.",
      "Перемешай.",
      "Сформируй печенье.",
      "Выпекай при 180°C около 15 минут."
    ]
  },

  {
    id: "16",
    title: "Куриные котлеты",
    category: "Обеды",
    time: 30,
    servings: 3,
    image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=1000",
    description: "Сочные котлеты из куриного филе.",
    ingredients: [
      { product: "Фарш куриный", grams: 400 },
      { product: "Яйцо", grams: 50 },
      { product: "Лук репчатый", grams: 60 },
      { product: "Овсянка", grams: 30 }
    ],
    steps: [
      "Смешай фарш с яйцом.",
      "Добавь лук и овсянку.",
      "Сформируй котлеты.",
      "Запеки или приготовь на сковороде."
    ]
  },

  {
    id: "17",
    title: "Лосось с овощами",
    category: "Ужины",
    time: 25,
    servings: 1,
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1000",
    description: "Лосось с запечёнными овощами.",
    ingredients: [
      { product: "Лосось", grams: 160 },
      { product: "Брокколи", grams: 150 },
      { product: "Цукини", grams: 100 },
      { product: "Оливковое масло", grams: 5 }
    ],
    steps: [
      "Нарежь овощи.",
      "Выложи всё на противень.",
      "Добавь масло.",
      "Запекай при 190°C около 20 минут."
    ]
  },

  {
    id: "18",
    title: "Чиа-пудинг с ягодами",
    category: "Завтраки",
    time: 5,
    servings: 1,
    image: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=1000",
    description: "Холодный завтрак с чиа и ягодами.",
    ingredients: [
      { product: "Кокосовое молоко", grams: 150 },
      { product: "Семена чиа", grams: 25 },
      { product: "Клубника", grams: 80 },
      { product: "Мёд", grams: 5 }
    ],
    steps: [
      "Смешай молоко и чиа.",
      "Оставь минимум на 2 часа.",
      "Добавь ягоды.",
      "Полей мёдом."
    ]
  },

  {
    id: "19",
    title: "Тёплый боул с говядиной",
    category: "Обеды",
    time: 30,
    servings: 1,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1000",
    description: "Сытный боул с говядиной и рисом.",
    ingredients: [
      { product: "Говядина постная", grams: 150 },
      { product: "Рис басмати", grams: 70 },
      { product: "Брокколи", grams: 100 },
      { product: "Морковь", grams: 60 },
      { product: "Соевый соус", grams: 10 }
    ],
    steps: [
      "Приготовь рис.",
      "Нарежь говядину.",
      "Обжарь мясо.",
      "Добавь овощи.",
      "Подавай с рисом."
    ]
  },

  {
    id: "20",
    title: "Протеиновый шоколадный мусс",
    category: "Десерты",
    time: 10,
    servings: 2,
    image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=1000",
    description: "Нежный шоколадный десерт.",
    ingredients: [
      { product: "Греческий йогурт", grams: 200 },
      { product: "Какао", grams: 15 },
      { product: "Банан", grams: 80 },
      { product: "Желатин", grams: 5 }
    ],
    steps: [
      "Замочи желатин.",
      "Пробей йогурт с бананом и какао.",
      "Раствори желатин.",
      "Смешай всё вместе.",
      "Охлади до застывания."
    ]
  },

  {
    id: "21",
    title: "Гречневые блинчики",
    category: "Завтраки",
    time: 20,
    servings: 2,
    image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=1000",
    description: "Тонкие блинчики из гречневой муки.",
    ingredients: [
      { product: "Гречневая мука", grams: 80 },
      { product: "Яйцо", grams: 50 },
      { product: "Молоко 1.5%", grams: 180 }
    ],
    steps: [
      "Смешай муку, яйцо и молоко.",
      "Дай тесту постоять 5 минут.",
      "Выпекай тонкие блинчики."
    ]
  },

  {
    id: "22",
    title: "Тунец с овощным салатом",
    category: "Ужины",
    time: 10,
    servings: 1,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1000",
    description: "Лёгкий белковый ужин.",
    ingredients: [
      { product: "Тунец", grams: 150 },
      { product: "Огурец", grams: 100 },
      { product: "Помидор", grams: 100 },
      { product: "Авокадо", grams: 50 }
    ],
    steps: [
      "Нарежь овощи.",
      "Добавь тунец.",
      "Добавь авокадо.",
      "Перемешай."
    ]
  },

  {
    id: "23",
    title: "Куриный суп с овощами",
    category: "Супы",
    time: 40,
    servings: 3,
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1000",
    description: "Лёгкий домашний суп с курицей.",
    ingredients: [
      { product: "Куриная грудка", grams: 250 },
      { product: "Картофель", grams: 200 },
      { product: "Морковь", grams: 100 },
      { product: "Лук репчатый", grams: 70 },
      { product: "Брокколи", grams: 100 }
    ],
    steps: [
      "Отвари курицу.",
      "Добавь картофель.",
      "Добавь морковь и лук.",
      "В конце добавь брокколи.",
      "Вари до готовности."
    ]
  },

  {
    id: "24",
    title: "Запечённая овсянка с яблоком",
    category: "Завтраки",
    time: 30,
    servings: 2,
    image: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=1000",
    description: "Тёплый завтрак с яблоком и корицей.",
    ingredients: [
      { product: "Овсянка", grams: 100 },
      { product: "Яблоко", grams: 150 },
      { product: "Молоко 1.5%", grams: 150 },
      { product: "Яйцо", grams: 50 },
      { product: "Корица", grams: 3 }
    ],
    steps: [
      "Смешай овсянку с молоком и яйцом.",
      "Добавь яблоко.",
      "Посыпь корицей.",
      "Запекай при 180°C около 25 минут."
    ]
  },

  {
    id: "25",
    title: "Творожный чизкейк без выпечки",
    category: "Десерты",
    time: 20,
    servings: 4,
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1000",
    description: "Нежный творожный десерт без духовки.",
    ingredients: [
      { product: "Творог 0%", grams: 300 },
      { product: "Греческий йогурт", grams: 150 },
      { product: "Желатин", grams: 10 },
      { product: "Мёд", grams: 20 },
      { product: "Клубника", grams: 100 }
    ],
    steps: [
      "Замочи желатин.",
      "Пробей творог и йогурт.",
      "Добавь мёд.",
      "Раствори желатин и смешай.",
      "Добавь клубнику.",
      "Охлади до полного застывания."
    ]
  },

  {
    id: "26",
    title: "Индейка с овощами",
    category: "Ужины",
    time: 25,
    servings: 1,
    image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=1000",
    description: "Нежная индейка с овощами.",
    ingredients: [
      { product: "Филе индейки", grams: 170 },
      { product: "Цукини", grams: 100 },
      { product: "Болгарский перец", grams: 80 },
      { product: "Оливковое масло", grams: 5 }
    ],
    steps: [
      "Нарежь индейку.",
      "Обжарь до готовности.",
      "Добавь овощи.",
      "Готовь ещё 7–10 минут."
    ]
  },

  {
    id: "27",
    title: "ПП брауни",
    category: "Десерты",
    time: 30,
    servings: 6,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=1000",
    description: "Шоколадный десерт с какао.",
    ingredients: [
      { product: "Творог 0%", grams: 200 },
      { product: "Яйцо", grams: 100 },
      { product: "Какао", grams: 25 },
      { product: "Рисовая мука", grams: 40 },
      { product: "Банан", grams: 100 }
    ],
    steps: [
      "Пробей творог и банан.",
      "Добавь яйца и какао.",
      "Вмешай муку.",
      "Переложи в форму.",
      "Выпекай при 180°C около 20 минут."
    ]
  },

  {
    id: "28",
    title: "Креветки с рисом",
    category: "Ужины",
    time: 20,
    servings: 1,
    image: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=1000",
    description: "Быстрый ужин с креветками.",
    ingredients: [
      { product: "Креветки", grams: 180 },
      { product: "Рис басмати", grams: 70 },
      { product: "Брокколи", grams: 100 },
      { product: "Соевый соус", grams: 10 }
    ],
    steps: [
      "Приготовь рис.",
      "Обжарь креветки.",
      "Добавь брокколи.",
      "Добавь соевый соус.",
      "Подавай с рисом."
    ]
  },

  {
    id: "29",
    title: "Банановый творожный десерт",
    category: "Десерты",
    time: 5,
    servings: 1,
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1000",
    description: "Быстрый творожный десерт с бананом.",
    ingredients: [
      { product: "Творог 0%", grams: 150 },
      { product: "Греческий йогурт", grams: 80 },
      { product: "Банан", grams: 100 },
      { product: "Какао", grams: 5 }
    ],
    steps: [
      "Смешай творог и йогурт.",
      "Добавь банан.",
      "Посыпь какао.",
      "Охлади перед подачей."
    ]
  },

  {
    id: "30",
    title: "Овощная фриттата",
    category: "Завтраки",
    time: 25,
    servings: 2,
    image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=1000",
    description: "Сытная яичная фриттата с овощами.",
    ingredients: [
      { product: "Яйцо", grams: 150 },
      { product: "Белок яйца", grams: 100 },
      { product: "Помидор", grams: 100 },
      { product: "Шпинат", grams: 50 },
      { product: "Сыр моцарелла", grams: 30 }
    ],
    steps: [
      "Взбей яйца и белки.",
      "Добавь овощи.",
      "Перелей смесь в форму.",
      "Добавь моцареллу.",
      "Запекай при 180°C около 15 минут."
    ]
  }
];

function num(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function normalizeProduct(row) {
  return {
    name: String(row?.name || "").trim(),
    kcal: num(row?.kcal),
    protein: num(row?.protein),
    fat: num(row?.fat),
    carbs: num(row?.carbs)
  };
}

function normalizeProducts(rows) {
  const out = {};

  (rows || []).forEach(row => {
    const p = normalizeProduct(row);

    if (p.name) {
      out[p.name] = {
        kcal: p.kcal,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs
      };
    }
  });

  return out;
}

function normalizeRecipe(row) {
  return {
    id: String(row?.id ?? Date.now()),
    title: String(row?.title || ""),
    category: String(row?.category || "Другое"),
    time: num(row?.time),
    servings: Math.max(1, num(row?.servings) || 1),
    image: String(row?.image || ""),
    description: String(row?.description || ""),
    ingredients: Array.isArray(row?.ingredients)
      ? row.ingredients.map(x => ({
          product: String(x?.product || ""),
          grams: num(x?.grams)
        }))
      : [],
    steps: Array.isArray(row?.steps)
      ? row.steps.map(String)
      : []
  };
}

function recipeNutrition(recipe, products) {
  let kcal = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;

  (recipe?.ingredients || []).forEach(item => {
    const p = products?.[item.product];

    if (!p) return;

    const factor = num(item.grams) / 100;

    kcal += num(p.kcal) * factor;
    protein += num(p.protein) * factor;
    fat += num(p.fat) * factor;
    carbs += num(p.carbs) * factor;
  });

  const servings = Math.max(1, num(recipe?.servings) || 1);

  return {
    kcal: Math.round(kcal / servings),
    protein: Math.round((protein / servings) * 10) / 10,
    fat: Math.round((fat / servings) * 10) / 10,
    carbs: Math.round((carbs / servings) * 10) / 10
  };
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) throw error;

  return data || [];
}

async function fetchRecipes() {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeRecipe);
}

async function upsertProduct(oldName, data, originalName = null) {
  const clean = String(data?.name || "").trim();

  if (!clean) {
    throw new Error("Введите название продукта.");
  }

  const old = String(originalName || oldName || "").trim();

  if (old && old !== clean) {
    const { error: renameError } = await supabase
      .from("products")
      .update({
        name: clean,
        kcal: num(data.kcal),
        protein: num(data.protein),
        fat: num(data.fat),
        carbs: num(data.carbs),
        updated_at: new Date().toISOString()
      })
      .eq("name", old);

    if (!renameError) {
      return {
        name: clean,
        kcal: num(data.kcal),
        protein: num(data.protein),
        fat: num(data.fat),
        carbs: num(data.carbs)
      };
    }
  }

  const payload = {
    name: clean,
    kcal: num(data.kcal),
    protein: num(data.protein),
    fat: num(data.fat),
    carbs: num(data.carbs),
    updated_at: new Date().toISOString()
  };

  const { data: saved, error } = await supabase
    .from("products")
    .upsert(payload, { onConflict: "name" })
    .select()
    .single();

  if (error) throw error;

  return normalizeProduct(saved);
}

async function removeProduct(name) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("name", name);

  if (error) throw error;
}

async function upsertRecipe(recipe) {
  const payload = {
    id: String(recipe.id),
    title: String(recipe.title || "").trim(),
    category: recipe.category || "Другое",
    time: num(recipe.time),
    servings: Math.max(1, num(recipe.servings) || 1),
    image: recipe.image || "",
    description: recipe.description || "",
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [],
    steps: Array.isArray(recipe.steps)
      ? recipe.steps
      : [],
    updated_at: new Date().toISOString()
  };

  if (!payload.title) {
    throw new Error("Введите название рецепта.");
  }

  const { data, error } = await supabase
    .from("recipes")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;

  return normalizeRecipe(data);
}

async function removeRecipe(id) {
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", String(id));

  if (error) throw error;
}

async function uploadRecipeImage(file) {
  if (!file) return null;

  if (Platform.OS !== "web") {
    throw new Error(
      "Загрузка файла сейчас настроена для веб-версии PaCook."
    );
  }

  const ext =
    (file.name?.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";

  const path =
    `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(RECIPE_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(RECIPE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

async function uploadProfileImage(file) {
  if (!file) return null;

  if (Platform.OS !== "web") {
    throw new Error(
      "Загрузка фото профиля сейчас настроена для веб-версии PaCook."
    );
  }

  const ext =
    (file.name?.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";

  const userId =
    (await supabase.auth.getUser()).data.user?.id ||
    "anonymous";

  const path =
    `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg"
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(PROFILE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
export default function App(){
 const[showSplash,setShowSplash]=useState(true),[authUser,setAuthUser]=useState(null),[authChecked,setAuthChecked]=useState(false),[products,setProducts]=useState(INITIAL_PRODUCTS),[recipes,setRecipes]=useState(INITIAL_RECIPES),[loadingData,setLoadingData]=useState(true),[screen,setScreen]=useState("home"),[selectedRecipe,setSelectedRecipe]=useState(null),[favorites,setFavorites]=useState([]),[diary,setDiary]=useState([]),[authorUnlocked,setAuthorUnlocked]=useState(false),[authorTab,setAuthorTab]=useState("recipes"),[editingProduct,setEditingProduct]=useState(null),[editingRecipe,setEditingRecipe]=useState(null),[search,setSearch]=useState(""),[category,setCategory]=useState("Все"),[profileName,setProfileName]=useState(""),[profileAvatar,setProfileAvatar]=useState(""),[profileSaving,setProfileSaving]=useState(false),[profileUploading,setProfileUploading]=useState(false);

 useEffect(()=>{const t=setTimeout(()=>setShowSplash(false),1200);return()=>clearTimeout(t)},[]);

 useEffect(()=>{let sub;(async()=>{try{const{data}=await supabase.auth.getSession();const user=data.session?.user||null;setAuthUser(user);if(user){setProfileName(user.user_metadata?.name||user.email?.split("@")[0]||"PaCook User");setProfileAvatar(user.user_metadata?.avatar_url||"");const fav=await AsyncStorage.getItem(`PACOOK_FAVORITES_${user.id}`);const dia=await AsyncStorage.getItem(`PACOOK_DIARY_${user.id}`);if(fav)setFavorites(JSON.parse(fav));if(dia)setDiary(JSON.parse(dia));try{const{data:prof}=await supabase.from("profiles").select("name").eq("id",user.id).maybeSingle();if(prof?.name)setProfileName(prof.name);}catch(e){}}}catch(e){console.log("AUTH INIT",e)}finally{setAuthChecked(true)}})();const{data}=supabase.auth.onAuthStateChange((_e,s)=>{const user=s?.user||null;setAuthUser(user);if(user){setProfileName(user.user_metadata?.name||user.email?.split("@")[0]||"PaCook User");setProfileAvatar(user.user_metadata?.avatar_url||"");}});sub=data.subscription;return()=>sub?.unsubscribe()},[]);

 useEffect(()=>{if(!authUser)return;let cancelled=false;(async()=>{try{const[fav,dia]=await Promise.all([AsyncStorage.getItem(`PACOOK_FAVORITES_${authUser.id}`),AsyncStorage.getItem(`PACOOK_DIARY_${authUser.id}`)]);if(cancelled)return;setFavorites(fav?JSON.parse(fav):[]);setDiary(dia?JSON.parse(dia):[]);}catch(e){console.log("LOCAL USER DATA",e)}})();return()=>{cancelled=true}},[authUser]);

 useEffect(()=>{if(!authUser)return;AsyncStorage.setItem(`PACOOK_FAVORITES_${authUser.id}`,JSON.stringify(favorites)).catch(()=>{})},[favorites,authUser]);

 useEffect(()=>{if(!authUser)return;AsyncStorage.setItem(`PACOOK_DIARY_${authUser.id}`,JSON.stringify(diary)).catch(()=>{})},[diary,authUser]);

 useEffect(()=>{if(!authChecked||!authUser)return;let cancelled=false;(async()=>{setLoadingData(true);try{let pr=[],rc=[];try{pr=await fetchProducts()}catch(e){console.log("PRODUCT LOAD",e?.message||e)}try{rc=await fetchRecipes()}catch(e){console.log("RECIPE LOAD",e?.message||e)}if(!cancelled){if(pr.length)setProducts(normalizeProducts(pr));if(rc.length)setRecipes(rc);}await seedMissingData(pr,rc);if(!cancelled){try{const[pr2,rc2]=await Promise.all([fetchProducts(),fetchRecipes()]);if(pr2.length)setProducts(normalizeProducts(pr2));if(rc2.length)setRecipes(rc2);}catch(e){console.log("RELOAD AFTER SEED",e?.message||e)}}}finally{if(!cancelled)setLoadingData(false)}})();return()=>{cancelled=true}},[authChecked,authUser]);

 const categories=useMemo(()=>["Все",...Array.from(new Set(recipes.map(r=>r.category).filter(Boolean)))],[recipes]);

 const filtered=useMemo(()=>recipes.filter(r=>(category==="Все"||r.category===category)&&(!search.trim()||r.title.toLowerCase().includes(search.toLowerCase())||String(r.description||"").toLowerCase().includes(search.toLowerCase()))),[recipes,category,search]);

 const toggleFavorite=id=>setFavorites(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

 const addDiary=r=>{setDiary(p=>[...p,{id:Date.now().toString(),recipeId:String(r.id),date:new Date().toISOString().slice(0,10)}]);Alert.alert("Готово","Рецепт добавлен в дневник.")};

 const logout=async()=>{try{if(authUser){await AsyncStorage.setItem(`PACOOK_FAVORITES_${authUser.id}`,JSON.stringify(favorites));await AsyncStorage.setItem(`PACOOK_DIARY_${authUser.id}`,JSON.stringify(diary));}await supabase.auth.signOut();}finally{setAuthUser(null);setScreen("home");setSelectedRecipe(null);}};

 const isAuthor=authorUnlocked||authUser?.user_metadata?.role==="author"||authUser?.app_metadata?.role==="author";

 const unlock=()=>{if(Platform.OS==="web"){const v=window.prompt("Введите пароль автора");if(v==="PaCook2026")setAuthorUnlocked(true);else if(v)Alert.alert("Ошибка","Неверный пароль.")}else Alert.alert("Автор","Назначь пользователю role=author в Supabase. ")};

 if(showSplash)return <SafeAreaView style={styles.splash}><Text style={styles.logo}>PaCook</Text><Text style={styles.tagline}>Cook smart. Eat better.</Text></SafeAreaView>;

 if(!authChecked)return <SafeAreaView style={styles.splash}><ActivityIndicator size="large" color={COLORS.green}/><Text style={styles.muted}>Загрузка…</Text></SafeAreaView>;

 if(!authUser)return <AuthScreen/>;

 if(screen==="detail"&&selectedRecipe)return <RecipeDetail recipe={selectedRecipe} products={products} favorite={favorites.includes(selectedRecipe.id)} onBack={()=>setScreen("home")} onFavorite={()=>toggleFavorite(selectedRecipe.id)} onDiary={()=>addDiary(selectedRecipe)}/>;

 if(screen==="profile")return <SafeAreaView style={styles.screen}><Header title="Профиль" onBack={()=>setScreen("home")}/><ScrollView contentContainerStyle={styles.profileContent}>

 <View style={styles.avatar}>
 {profileAvatar?<Image source={{uri:profileAvatar}} style={styles.avatarImage}/>:<Text style={{fontSize:38}}>👨‍🍳</Text>}
 </View>

 <TextInput style={[styles.input,{width:"100%"}]} value={profileName} onChangeText={setProfileName} placeholder="Твой ник"/>

 <Text style={styles.muted}>{authUser.email}</Text>

 <TextInput style={[styles.input,{width:"100%",marginTop:12}]} value={profileAvatar} onChangeText={setProfileAvatar} placeholder="URL фото профиля" autoCapitalize="none"/>

 <TouchableOpacity style={styles.secondaryBtn} onPress={()=>{if(Platform.OS!=="web")return Alert.alert("Фото","Выбор файла сейчас доступен в веб-версии.");const input=document.createElement("input");input.type="file";input.accept="image/*";input.onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{setProfileUploading(true);const url=await uploadProfileImage(file);if(url)setProfileAvatar(url);}catch(err){Alert.alert("Ошибка загрузки",err?.message||"Не удалось загрузить фото. Проверь bucket profile-images и policies.")}finally{setProfileUploading(false)}};input.click()}} disabled={profileUploading}>
 <Text style={styles.secondaryText}>{profileUploading?"Загружаю фото…":"📷 Выбрать фото профиля"}</Text>
 </TouchableOpacity>

 <TouchableOpacity style={styles.primaryBtn} onPress={async()=>{try{setProfileSaving(true);const u=await saveProfileData(authUser,profileName,profileAvatar);setAuthUser(u);setProfileName(u?.user_metadata?.name||profileName);setProfileAvatar(u?.user_metadata?.avatar_url||profileAvatar);Alert.alert("Готово","Профиль сохранён.");}catch(e){Alert.alert("Ошибка",e?.message||"Не удалось сохранить профиль.")}finally{setProfileSaving(false)}}} disabled={profileSaving}>
 <Text style={styles.primaryText}>{profileSaving?"Сохраняю…":"Сохранить профиль"}</Text>
 </TouchableOpacity>

 <TouchableOpacity style={styles.primaryBtn} onPress={()=>setScreen("author")}>
 <Text style={styles.primaryText}>Авторский режим</Text>
 </TouchableOpacity>

 <TouchableOpacity style={styles.secondaryBtn} onPress={logout}>
 <Text style={styles.secondaryText}>Выйти</Text>
 </TouchableOpacity>

 </ScrollView></SafeAreaView>;

 if(screen==="diary"){
  const items=diary.filter(x=>x.date===new Date().toISOString().slice(0,10));
  const total=items.reduce((a,x)=>a+recipeNutrition(recipes.find(r=>String(r.id)===String(x.recipeId))||{},products).kcal,0);

  return <SafeAreaView style={styles.screen}>
   <Header title="Дневник" onBack={()=>setScreen("home")}/>
   <ScrollView contentContainerStyle={styles.listContent}>
    <View style={styles.diarySummary}>
     <Text style={styles.bigKcal}>{total} ккал</Text>
     <Text style={styles.muted}>Сегодня</Text>
    </View>

    {items.length===0?<Text style={styles.empty}>Пока ничего не добавлено.</Text>:items.map(x=>{
     const r=recipes.find(z=>String(z.id)===String(x.recipeId));
     if(!r)return null;
     const n=recipeNutrition(r,products);

     return <View key={x.id} style={styles.adminCard}>
      <View style={{flex:1}}>
       <Text style={styles.adminTitle}>{r.title}</Text>
       <Text style={styles.adminMeta}>{n.kcal} ккал · Б {n.protein} · Ж {n.fat} · У {n.carbs}</Text>
      </View>
      <TouchableOpacity style={styles.smallDelete} onPress={()=>setDiary(p=>p.filter(z=>z.id!==x.id))}>
       <Text>×</Text>
      </TouchableOpacity>
     </View>
    })}
   </ScrollView>
  </SafeAreaView>
 }

 if(screen==="author"){
  if(!isAuthor)return <SafeAreaView style={styles.screen}>
   <Header title="Автор" onBack={()=>setScreen("profile")}/>
   <View style={styles.center}>
    <Text style={styles.detailTitle}>Авторский режим</Text>
    <Text style={styles.detailDescription}>Изменения сохраняются в общей базе Supabase и после обновления будут видны другим пользователям.</Text>
    <TouchableOpacity style={styles.primaryBtn} onPress={unlock}>
     <Text style={styles.primaryText}>Открыть режим автора</Text>
    </TouchableOpacity>
   </View>
  </SafeAreaView>;

  if(editingProduct)return <SafeAreaView style={styles.screen}>
   <ProductEditor
    product={editingProduct}
    onClose={()=>setEditingProduct(null)}
    onSaved={saved=>{setProducts(p=>{const c={...p};if(editingProduct.name&&editingProduct.name!==saved.name)delete c[editingProduct.name];c[saved.name]={kcal:num(saved.kcal),protein:num(saved.protein),fat:num(saved.fat),carbs:num(saved.carbs)};return c})}}
   />
  </SafeAreaView>;

  if(editingRecipe)return <SafeAreaView style={styles.screen}>
   <RecipeEditor
    recipe={editingRecipe}
    onClose={()=>setEditingRecipe(null)}
    onSaved={saved=>setRecipes(p=>p.some(x=>String(x.id)===String(saved.id))?p.map(x=>String(x.id)===String(saved.id)?saved:x):[saved,...p])}
   />
  </SafeAreaView>;

  return <SafeAreaView style={styles.screen}>
   <Header title="Автор" onBack={()=>setScreen("profile")}/>

   <View style={styles.tabs}>
    <TouchableOpacity style={[styles.tab,authorTab==="recipes"&&styles.tabActive]} onPress={()=>setAuthorTab("recipes")}>
     <Text>Рецепты</Text>
    </TouchableOpacity>

    <TouchableOpacity style={[styles.tab,authorTab==="products"&&styles.tabActive]} onPress={()=>setAuthorTab("products")}>
     <Text>Продукты</Text>
    </TouchableOpacity>
   </View>

   {authorTab==="recipes"?<ScrollView contentContainerStyle={styles.listContent}>
    <TouchableOpacity style={styles.primaryBtn} onPress={()=>setEditingRecipe({id:Date.now().toString(),title:"",category:"Другое",time:10,servings:1,image:"",description:"",ingredients:[],steps:[]})}>
     <Text style={styles.primaryText}>＋ Новый рецепт</Text>
    </TouchableOpacity>

    {recipes.map(r=><View key={r.id} style={styles.adminCard}>
     <View style={{flex:1}}>
      <Text style={styles.adminTitle}>{r.title}</Text>
      <Text style={styles.adminMeta}>{r.category} · {r.time} мин</Text>
     </View>

     <TouchableOpacity style={styles.smallBtn} onPress={()=>setEditingRecipe(clone(r))}>
      <Text>✎</Text>
     </TouchableOpacity>

     <TouchableOpacity style={styles.smallDelete} onPress={()=>Alert.alert("Удалить?",r.title,[{text:"Отмена",style:"cancel"},{text:"Удалить",style:"destructive",onPress:async()=>{try{await removeRecipe(r.id);setRecipes(p=>p.filter(x=>String(x.id)!==String(r.id)))}catch(e){Alert.alert("Ошибка",e?.message||"Не удалось удалить")}}}])}>
      <Text>×</Text>
     </TouchableOpacity>
    </View>)}
   </ScrollView>:<ScrollView contentContainerStyle={styles.listContent}>

    <TouchableOpacity style={styles.primaryBtn} onPress={()=>setEditingProduct({name:"",kcal:0,protein:0,fat:0,carbs:0})}>
     <Text style={styles.primaryText}>＋ Новый продукт</Text>
    </TouchableOpacity>

    {Object.entries(products).map(([name,data])=><View key={name} style={styles.adminCard}>
     <View style={{flex:1}}>
      <Text style={styles.adminTitle}>{name}</Text>
      <Text style={styles.adminMeta}>{data.kcal} ккал · Б {data.protein} · Ж {data.fat} · У {data.carbs}</Text>
     </View>

     <TouchableOpacity style={styles.smallBtn} onPress={()=>setEditingProduct({name,...data})}>
      <Text>✎</Text>
     </TouchableOpacity>

     <TouchableOpacity style={styles.smallDelete} onPress={()=>Alert.alert("Удалить?",name,[{text:"Отмена",style:"cancel"},{text:"Удалить",style:"destructive",onPress:async()=>{try{await removeProduct(name);setProducts(p=>{const c={...p};delete c[name];return c})}catch(e){Alert.alert("Ошибка",e?.message||"Не удалось удалить")}}}])}>
      <Text>×</Text>
     </TouchableOpacity>
    </View>)}
   </ScrollView>}
  </SafeAreaView>;
 }

 return <SafeAreaView style={styles.screen}>
  <View style={styles.homeHeader}>
   <View>
    <Text style={styles.logoSmall}>PaCook</Text>
    <Text style={styles.taglineSmall}>Cook smart. Eat better.</Text>
   </View>

   <TouchableOpacity style={styles.profileCircle} onPress={()=>setScreen("profile")}>
    <Text style={{fontSize:20}}>👨‍🍳</Text>
   </TouchableOpacity>
  </View>

  <ScrollView contentContainerStyle={styles.listContent}>
   <TextInput style={styles.search} placeholder="Поиск рецептов…" value={search} onChangeText={setSearch}/>

   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingBottom:12}}>
    {categories.map(c=><TouchableOpacity key={c} onPress={()=>setCategory(c)} style={[styles.chip,c===category&&styles.chipActive]}>
     <Text style={{color:c===category?COLORS.white:COLORS.green,fontWeight:"600"}}>{c}</Text>
    </TouchableOpacity>)}
   </ScrollView>

   <View style={styles.quickRow}>
    <TouchableOpacity style={styles.quick} onPress={()=>setScreen("diary")}>
     <Text style={styles.quickEmoji}>📓</Text>
     <Text style={styles.quickText}>Дневник</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quick} onPress={()=>{setCategory("Все");setSearch("")}}>
     <Text style={styles.quickEmoji}>🍽️</Text>
     <Text style={styles.quickText}>{recipes.length} рецептов</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quick} onPress={()=>setScreen("profile")}>
     <Text style={styles.quickEmoji}>👤</Text>
     <Text style={styles.quickText}>Профиль</Text>
    </TouchableOpacity>
   </View>

   <Text style={styles.sectionTitle}>Рецепты</Text>

   {loadingData?<ActivityIndicator color={COLORS.green}/>:filtered.length===0?<Text style={styles.empty}>Ничего не найдено.</Text>:filtered.map(r=>
    <RecipeCard
     key={r.id}
     recipe={r}
     products={products}
     favorite={favorites.includes(r.id)}
     onOpen={()=>{setSelectedRecipe(r);setScreen("detail")}}
     onFavorite={()=>toggleFavorite(r.id)}
    />
   )}
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
  screen:{
    flex:1,
    backgroundColor:COLORS.bg
  },

  splash:{
    flex:1,
    backgroundColor:COLORS.bg,
    alignItems:"center",
    justifyContent:"center"
  },

  auth:{
    flex:1,
    backgroundColor:COLORS.bg,
    justifyContent:"center",
    padding:24
  },

  logo:{
    fontSize:42,
    fontWeight:"900",
    color:COLORS.green,
    textAlign:"center"
  },

  tagline:{
    textAlign:"center",
    color:COLORS.muted,
    marginTop:6,
    marginBottom:30
  },

  logoSmall:{
    fontSize:28,
    fontWeight:"900",
    color:COLORS.green
  },

  taglineSmall:{
    fontSize:12,
    color:COLORS.muted
  },

  homeHeader:{
    paddingHorizontal:18,
    paddingTop:12,
    paddingBottom:12,
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between"
  },

  profileCircle:{
    width:44,
    height:44,
    borderRadius:22,
    backgroundColor:COLORS.lightGreen,
    alignItems:"center",
    justifyContent:"center"
  },

  header:{
    height:60,
    paddingHorizontal:14,
    flexDirection:"row",
    alignItems:"center",
    borderBottomWidth:1,
    borderBottomColor:COLORS.border
  },

  backBtn:{
    width:42
  },

  backText:{
    fontSize:36,
    color:COLORS.green,
    lineHeight:40
  },

  headerTitle:{
    fontSize:19,
    fontWeight:"800",
    color:COLORS.text
  },

  headerSpacer:{
    width:42
  },

  listContent:{
    padding:16,
    paddingBottom:40
  },

  search:{
    backgroundColor:COLORS.white,
    borderWidth:1,
    borderColor:COLORS.border,
    borderRadius:14,
    paddingHorizontal:16,
    paddingVertical:13,
    fontSize:16,
    marginBottom:12
  },

  chip:{
    paddingHorizontal:14,
    paddingVertical:9,
    borderRadius:20,
    backgroundColor:COLORS.white,
    borderWidth:1,
    borderColor:COLORS.border,
    marginRight:8
  },

  chipActive:{
    backgroundColor:COLORS.green,
    borderColor:COLORS.green
  },

  quickRow:{
    flexDirection:"row",
    gap:8,
    marginBottom:10
  },

  quick:{
    flex:1,
    backgroundColor:COLORS.card,
    borderRadius:16,
    padding:12,
    borderWidth:1,
    borderColor:COLORS.border
  },

  quickEmoji:{
    fontSize:20
  },

  quickText:{
    marginTop:5,
    fontWeight:"700",
    color:COLORS.text,
    fontSize:12
  },

  sectionTitle:{
    fontSize:20,
    fontWeight:"800",
    color:COLORS.text,
    marginTop:18,
    marginBottom:12
  },

  recipeCard:{
    backgroundColor:COLORS.card,
    borderRadius:20,
    overflow:"hidden",
    marginBottom:14,
    borderWidth:1,
    borderColor:COLORS.border
  },

  recipeImage:{
    width:"100%",
    height:190,
    backgroundColor:COLORS.lightGreen
  },

  recipeBody:{
    padding:14
  },

  rowBetween:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    gap:8
  },

  recipeTitle:{
    fontSize:18,
    fontWeight:"800",
    color:COLORS.text,
    flex:1
  },

  favorite:{
    fontSize:28,
    color:COLORS.muted
  },

  favoriteActive:{
    color:COLORS.red
  },

  recipeMeta:{
    color:COLORS.muted,
    marginTop:6
  },

  macroLine:{
    color:COLORS.green,
    fontWeight:"700",
    marginTop:8
  },

  detailContent:{
    paddingBottom:40
  },

  detailImage:{
    width:"100%",
    height:260
  },

  detailCard:{
    padding:18
  },

  detailTitle:{
    fontSize:28,
    fontWeight:"900",
    color:COLORS.text,
    flex:1
  },

  detailDescription:{
    fontSize:15,
    color:COLORS.muted,
    lineHeight:22,
    marginTop:8
  },

  macroBox:{
    marginTop:16,
    padding:14,
    borderRadius:16,
    backgroundColor:COLORS.lightGreen,
    flexDirection:"row",
    gap:12,
    alignItems:"center",
    flexWrap:"wrap"
  },

  bigKcal:{
    fontSize:22,
    fontWeight:"900",
    color:COLORS.green
  },

  ingredientRow:{
    flexDirection:"row",
    justifyContent:"space-between",
    paddingVertical:10,
    borderBottomWidth:1,
    borderBottomColor:COLORS.border
  },

  ingredientName:{
    color:COLORS.text
  },

  ingredientGrams:{
    color:COLORS.muted,
    fontWeight:"700"
  },

  stepRow:{
    flexDirection:"row",
    gap:10,
    marginBottom:12
  },

  stepNum:{
    width:28,
    height:28,
    borderRadius:14,
    backgroundColor:COLORS.green,
    color:COLORS.white,
    textAlign:"center",
    paddingTop:5,
    fontWeight:"800",
    overflow:"hidden"
  },

  stepText:{
    flex:1,
    color:COLORS.text,
    lineHeight:21
  },

  primaryBtn:{
    backgroundColor:COLORS.green,
    borderRadius:14,
    paddingVertical:14,
    paddingHorizontal:16,
    alignItems:"center",
    marginTop:14
  },

  primaryText:{
    color:COLORS.white,
    fontWeight:"800",
    fontSize:16
  },

  secondaryBtn:{
    backgroundColor:COLORS.lightGreen,
    borderRadius:14,
    paddingVertical:13,
    paddingHorizontal:16,
    alignItems:"center",
    marginTop:10
  },

  secondaryText:{
    color:COLORS.green,
    fontWeight:"800"
  },

  input:{
    backgroundColor:COLORS.white,
    borderRadius:13,
    borderWidth:1,
    borderColor:COLORS.border,
    padding:14,
    fontSize:16,
    marginBottom:10
  },

  errorText:{
    color:COLORS.red,
    marginBottom:8
  },

  linkText:{
    color:COLORS.green,
    fontWeight:"700",
    textAlign:"center",
    marginTop:18
  },

  tabs:{
    flexDirection:"row",
    padding:10,
    gap:8
  },

  tab:{
    flex:1,
    padding:12,
    alignItems:"center",
    borderRadius:12,
    backgroundColor:COLORS.white
  },

  tabActive:{
    backgroundColor:COLORS.lightGreen
  },

  adminCard:{
    backgroundColor:COLORS.card,
    borderRadius:14,
    borderWidth:1,
    borderColor:COLORS.border,
    padding:12,
    marginBottom:8,
    flexDirection:"row",
    alignItems:"center",
    gap:8
  },

  adminTitle:{
    fontWeight:"800",
    color:COLORS.text
  },

  adminMeta:{
    color:COLORS.muted,
    marginTop:4,
    fontSize:12
  },

  smallBtn:{
    width:38,
    height:38,
    borderRadius:10,
    backgroundColor:COLORS.lightGreen,
    alignItems:"center",
    justifyContent:"center"
  },

  smallDelete:{
    width:38,
    height:38,
    borderRadius:10,
    backgroundColor:"#F8E7E6",
    alignItems:"center",
    justifyContent:"center"
  },

  deleteText:{
    fontSize:26,
    color:COLORS.red,
    paddingHorizontal:6
  },

  editorContent:{
    padding:16,
    paddingBottom:50
  },

  editorTitle:{
    fontSize:24,
    fontWeight:"900",
    marginVertical:14,
    color:COLORS.text
  },

  editorLabel:{
    fontSize:17,
    fontWeight:"800",
    color:COLORS.text,
    marginTop:18,
    marginBottom:10
  },

  multiline:{
    minHeight:80,
    textAlignVertical:"top"
  },

  ingredientEdit:{
    flexDirection:"row",
    alignItems:"center",
    marginBottom:8
  },

  stepEdit:{
    flexDirection:"row",
    alignItems:"center",
    gap:8,
    marginBottom:8
  },

  center:{
    flex:1,
    padding:24,
    justifyContent:"center"
  },

  profileContent:{
    padding:24,
    alignItems:"center"
  },

  avatar:{
    width:90,
    height:90,
    borderRadius:45,
    backgroundColor:COLORS.lightGreen,
    alignItems:"center",
    justifyContent:"center",
    marginBottom:16,
    overflow:"hidden"
  },

  avatarImage:{
    width:"100%",
    height:"100%"
  },

  muted:{
    color:COLORS.muted,
    marginTop:4
  },

  diarySummary:{
    backgroundColor:COLORS.lightGreen,
    borderRadius:18,
    padding:18,
    marginBottom:16
  },

  empty:{
    textAlign:"center",
    color:COLORS.muted,
    paddingVertical:30
  }
});