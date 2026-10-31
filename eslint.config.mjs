import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";
import oxlint from "eslint-plugin-oxlint";

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
        files: ["tools/**/*.js", "scripts/js/**/*.js"],
        languageOptions: { sourceType: "script" },
    },
    {
        ignores: ["node_modules/", "temp/", "dist/", "artifacts/", "scripts/js/libs/"],
    },
    // Must stay last: turns off ESLint rules that oxlint already checks, so each rule runs once.
    ...oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
];
