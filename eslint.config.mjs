import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
    js.configs.recommended,
    prettierConfig,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                mat4: "readonly",
                mat3: "readonly",
                vec3: "readonly",
                vec4: "readonly",
                quat: "readonly",
                Stats: "readonly",
                glMatrix: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "brace-style": ["error", "allman"],
            "linebreak-style": "off",
        },
    },
    {
        ignores: ["node_modules/", "temp/", "scripts/js/libs/"],
    },
];
