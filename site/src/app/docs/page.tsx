export const metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Docs</h1>
      <div className="prose prose-zinc mt-6 dark:prose-invert">
        <h2>De onde vêm os números</h2>
        <p>
          Perfil, repositórios, stars e linguagens vêm da API pública do GitHub. Commits, PRs,
          issues e reviews são a soma <strong>all-time</strong> de todos os teus anos de contribuição
          (a API padrão só mostra 365 dias — aqui somamos ano a ano num worker).
        </p>
        <h2>O que é salvo</h2>
        <p>
          Nada teu. O worker guarda o resultado por usuário em cache por 7 dias (pra não
          recalcular) e conta usos por dia. Teus campos de zoeira ficam só no teu navegador.
        </p>
        <h2>Link compartilhável</h2>
        <p>
          <code>?u=octocat&amp;cafe=4&amp;sexta=2&amp;prod=30&amp;reuniao=5</code> abre a conta
          preenchida. Manda no grupo.
        </p>
        <h2>Limites</h2>
        <p>
          Top linguagens e stars consideram teus 100 repos próprios com mais stars. Conta privada
          ou usuário inexistente retorna erro claro.
        </p>
      </div>
    </div>
  );
}
