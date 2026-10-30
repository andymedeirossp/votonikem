/** Gera somente as classes usadas nas páginas e scripts do site. */
module.exports = {
  content: ["./*.html", "./manutencao/*.html", "./js/**/*.js"],
  theme: { extend: {} },
  plugins: []
};
