'use strict';

// Local UI messages only. Media titles and destination-site content are never translated.
const messages = {
  en: {
    eyebrow:'THE CONVERSATION CONTINUES.', intro:"You've watched it. Now join the conversation.",
    language:'Language', selection:'Media selection', titleLabel:'Title to search', seriesTitleLabel:'Series title to search', placeholder:'e.g. Raw or a series title',
    typeLabel:'Content type', movie:'Movie', series:'TV series', episode:'TV episode',
    scopeLabel:'Search scope', scopeSeries:'Entire series', scopeEpisode:'This episode',
    seasonLabel:'Season', episodeLabel:'Episode', otherTitles:'Other titles found on this page',
    reading:'Reading movie or TV information…', check:'Check the title and content type before opening a destination.',
    manual:'No single movie or TV title detected. Enter a title and choose its type.',
    missingSeries:'Episode detected, but its series title is missing. Enter the series title.',
    noTab:'No active tab found. You can enter a title.', restricted:'This page cannot be read. You can enter a title.',
    readFailed:'Could not read this page. You can enter a title.', entered:'Your entered title and content type will be used.',
    openFailed:'Could not open a new tab. Please try again.', languageSaveFailed:'Language changed, but could not be saved. Switch languages to retry.',
    eksiDescription:'Explore discussions in Turkish', letterboxdDescription:'Read reviews and rate on Letterboxd',
    letterboxdId:'Open the movie using its IMDb ID', letterboxdSearch:'Search by movie title',
    letterboxdTv:'Search by series title. Most TV shows and episodes are not available on Letterboxd.',
    eksiSeries:'Search for discussions about the series', eksiEpisode:'Search: {title} · Season {season}, episode {episode}',
    episodeMissing:'Enter season and episode numbers for an episode search.',
    spoiler:'Series discussions may contain spoilers for later episodes. Episode search does not filter spoilers.',
    sourceAlternative:'Alternative title on this page', sourceMetadata:'Media metadata', sourceHeading:'Page heading',
    episodeDetail:'Season {season} · Episode {episode}', unknown:'?',
  },
  es: {
    eyebrow:'LA CONVERSACIÓN CONTINÚA.', intro:'Ya lo has visto. Ahora únete a la conversación.',
    language:'Idioma', selection:'Selección de contenido', titleLabel:'Título para buscar', seriesTitleLabel:'Título de la serie para buscar', placeholder:'p. ej., Raw o el título de una serie',
    typeLabel:'Tipo de contenido', movie:'Película', series:'Serie de TV', episode:'Episodio de TV',
    scopeLabel:'Alcance de la búsqueda', scopeSeries:'Toda la serie', scopeEpisode:'Este episodio',
    seasonLabel:'Temporada', episodeLabel:'Episodio', otherTitles:'Otros títulos encontrados en esta página',
    reading:'Leyendo información de cine o TV…', check:'Comprueba el título y el tipo de contenido antes de abrir un destino.',
    manual:'No se ha detectado un único título de cine o TV. Introduce un título y elige su tipo.',
    missingSeries:'Se ha detectado un episodio, pero falta el título de la serie. Introdúcelo.',
    noTab:'No se ha encontrado una pestaña activa. Puedes introducir un título.', restricted:'No se puede leer esta página. Puedes introducir un título.',
    readFailed:'No se ha podido leer esta página. Puedes introducir un título.', entered:'Se usarán el título y el tipo de contenido que has introducido.',
    openFailed:'No se ha podido abrir una nueva pestaña. Inténtalo de nuevo.', languageSaveFailed:'El idioma ha cambiado, pero no se ha podido guardar. Cambia de idioma para reintentar.',
    eksiDescription:'Explora conversaciones en turco', letterboxdDescription:'Lee reseñas y puntúa en Letterboxd',
    letterboxdId:'Abrir la película mediante su ID de IMDb', letterboxdSearch:'Buscar por título de película',
    letterboxdTv:'Buscar por título de serie. La mayoría de las series y los episodios no están disponibles en Letterboxd.',
    eksiSeries:'Buscar conversaciones sobre la serie', eksiEpisode:'Buscar: {title} · Temporada {season}, episodio {episode}',
    episodeMissing:'Introduce los números de temporada y episodio para buscar un episodio.',
    spoiler:'Las conversaciones sobre la serie pueden revelar episodios posteriores. La búsqueda de episodios no filtra spoilers.',
    sourceAlternative:'Título alternativo de esta página', sourceMetadata:'Metadatos del contenido', sourceHeading:'Encabezado de la página',
    episodeDetail:'Temporada {season} · Episodio {episode}', unknown:'?',
  },
  pt: {
    eyebrow:'A CONVERSA CONTINUA.', intro:'Você já assistiu. Agora participe da conversa.',
    language:'Idioma', selection:'Seleção de conteúdo', titleLabel:'Título para pesquisar', seriesTitleLabel:'Título da série para pesquisar', placeholder:'Ex.: Raw ou o título de uma série',
    typeLabel:'Tipo de conteúdo', movie:'Filme', series:'Série de TV', episode:'Episódio de TV',
    scopeLabel:'Escopo da pesquisa', scopeSeries:'Série inteira', scopeEpisode:'Este episódio',
    seasonLabel:'Temporada', episodeLabel:'Episódio', otherTitles:'Outros títulos encontrados nesta página',
    reading:'Lendo informações de cinema ou TV…', check:'Confira o título e o tipo de conteúdo antes de abrir um destino.',
    manual:'Não foi detectado um único título de cinema ou TV. Digite um título e escolha o tipo.',
    missingSeries:'Episódio detectado, mas o título da série está ausente. Digite o título da série.',
    noTab:'Nenhuma aba ativa encontrada. Você pode digitar um título.', restricted:'Esta página não pode ser lida. Você pode digitar um título.',
    readFailed:'Não foi possível ler esta página. Você pode digitar um título.', entered:'Serão usados o título e o tipo de conteúdo que você informou.',
    openFailed:'Não foi possível abrir uma nova aba. Tente novamente.', languageSaveFailed:'O idioma foi alterado, mas não foi salvo. Troque de idioma para tentar novamente.',
    eksiDescription:'Explore conversas em turco', letterboxdDescription:'Leia resenhas e avalie no Letterboxd',
    letterboxdId:'Abrir o filme usando o ID do IMDb', letterboxdSearch:'Pesquisar pelo título do filme',
    letterboxdTv:'Pesquisar pelo título da série. A maioria das séries e dos episódios não está disponível no Letterboxd.',
    eksiSeries:'Pesquisar conversas sobre a série', eksiEpisode:'Pesquisar: {title} · Temporada {season}, episódio {episode}',
    episodeMissing:'Informe os números da temporada e do episódio para pesquisar um episódio.',
    spoiler:'As conversas sobre a série podem revelar episódios posteriores. A busca por episódios não filtra spoilers.',
    sourceAlternative:'Título alternativo nesta página', sourceMetadata:'Metadados do conteúdo', sourceHeading:'Título da página',
    episodeDetail:'Temporada {season} · Episódio {episode}', unknown:'?',
  },
  it: {
    eyebrow:'LA CONVERSAZIONE CONTINUA.', intro:'Hai finito di guardare. Ora partecipa alla conversazione.',
    language:'Lingua', selection:'Selezione del contenuto', titleLabel:'Titolo da cercare', seriesTitleLabel:'Titolo della serie da cercare', placeholder:'Es. Raw o il titolo di una serie',
    typeLabel:'Tipo di contenuto', movie:'Film', series:'Serie TV', episode:'Episodio TV',
    scopeLabel:'Ambito della ricerca', scopeSeries:'Intera serie', scopeEpisode:'Questo episodio',
    seasonLabel:'Stagione', episodeLabel:'Episodio', otherTitles:'Altri titoli trovati in questa pagina',
    reading:'Lettura delle informazioni su film o TV…', check:'Controlla il titolo e il tipo di contenuto prima di aprire una destinazione.',
    manual:'Non è stato rilevato un unico titolo di film o TV. Inserisci un titolo e scegli il tipo.',
    missingSeries:'Episodio rilevato, ma manca il titolo della serie. Inseriscilo.',
    noTab:'Nessuna scheda attiva trovata. Puoi inserire un titolo.', restricted:'Questa pagina non può essere letta. Puoi inserire un titolo.',
    readFailed:'Impossibile leggere questa pagina. Puoi inserire un titolo.', entered:'Verranno usati il titolo e il tipo di contenuto che hai inserito.',
    openFailed:'Impossibile aprire una nuova scheda. Riprova.', languageSaveFailed:'La lingua è cambiata, ma non è stata salvata. Cambia lingua per riprovare.',
    eksiDescription:'Esplora conversazioni in turco', letterboxdDescription:'Leggi recensioni e dai un voto su Letterboxd',
    letterboxdId:'Apri il film usando il suo ID IMDb', letterboxdSearch:'Cerca per titolo del film',
    letterboxdTv:'Cerca per titolo della serie. La maggior parte delle serie e degli episodi non è disponibile su Letterboxd.',
    eksiSeries:'Cerca conversazioni sulla serie', eksiEpisode:'Cerca: {title} · Stagione {season}, episodio {episode}',
    episodeMissing:'Inserisci i numeri di stagione ed episodio per cercare un episodio.',
    spoiler:'Le conversazioni sulla serie possono rivelare episodi successivi. La ricerca degli episodi non filtra gli spoiler.',
    sourceAlternative:'Titolo alternativo in questa pagina', sourceMetadata:'Metadati del contenuto', sourceHeading:'Titolo della pagina',
    episodeDetail:'Stagione {season} · Episodio {episode}', unknown:'?',
  },
  tr: {
    eyebrow:'SOHBET DEVAM EDİYOR.', intro:'İzledin. Şimdi sohbete katıl.',
    language:'Dil', selection:'İçerik seçimi', titleLabel:'Aranacak başlık', seriesTitleLabel:'Aranacak dizi adı', placeholder:'Örn. Raw veya bir dizi adı',
    typeLabel:'İçerik türü', movie:'Film', series:'Dizi', episode:'Dizi bölümü',
    scopeLabel:'Arama kapsamı', scopeSeries:'Dizinin geneli', scopeEpisode:'Bu bölüm',
    seasonLabel:'Sezon', episodeLabel:'Bölüm', otherTitles:'Bu sayfada bulunan diğer adlar',
    reading:'Film veya dizi bilgisi okunuyor…', check:'Yönlendirmeden önce başlığı ve içerik türünü kontrol et.',
    manual:'Tek bir film veya dizi başlığı algılanamadı. Bir başlık gir ve türünü seç.',
    missingSeries:'Bölüm algılandı ancak dizi adı eksik. Dizinin adını gir.',
    noTab:'Etkin sekme bulunamadı. Bir başlık girebilirsin.', restricted:'Bu sayfa okunamıyor. Bir başlık girebilirsin.',
    readFailed:'Bu sayfa okunamadı. Bir başlık girebilirsin.', entered:'Girdiğin başlık ve içerik türü kullanılacak.',
    openFailed:'Yeni sekme açılamadı. Lütfen tekrar dene.', languageSaveFailed:'Dil değiştirildi ancak kaydedilemedi. Tekrar denemek için başka bir dil seç.',
    eksiDescription:'Türkçe tartışmaları keşfet', letterboxdDescription:'Letterboxd’da incelemeleri oku ve puan ver',
    letterboxdId:'Filmi IMDb kimliğiyle aç', letterboxdSearch:'Film adına göre ara',
    letterboxdTv:'Dizi adına göre ara. Çoğu dizi ve bölüm Letterboxd’da bulunmuyor.',
    eksiSeries:'Dizi hakkındaki tartışmaları ara', eksiEpisode:'Arama: {title} · {season}. sezon, {episode}. bölüm',
    episodeMissing:'Bölüm araması için sezon ve bölüm numaralarını gir.',
    spoiler:'Dizi tartışmaları sonraki bölümlerle ilgili spoiler içerebilir. Bölüm araması spoilerları filtrelemez.',
    sourceAlternative:'Bu sayfadaki alternatif ad', sourceMetadata:'İçerik metadatası', sourceHeading:'Sayfa başlığı',
    episodeDetail:'{season}. sezon · {episode}. bölüm', unknown:'?',
  }
};
const settingsMessages = {
  en: {
    settings:'Settings', back:'Back',
    global:'Global', redditRegion:'Global · predominantly English', eksiRegion:'Türkiye · Turkish',
    redditSetting:'Search film and TV discussions. Result language and matching episode threads are not guaranteed.',
    eksiSetting:'Search Turkish film and TV discussions. A series often shares one topic across episodes.',
    letterboxdSetting:'Movie reviews and ratings. TV availability is limited.', redditDescription:'Find film and TV discussions',
    redditSearch:'Search: {query}', platformSaveFailed:'Platform choices could not be saved. Toggle a platform to retry.',
    settingsLoadFailed:'Saved preferences could not be loaded. Check your choices before navigating.',
    footer:'Opens a new tab only when you click. Saves language and platform preferences; no watch history.'
  },
  es: {
    settings:'Ajustes', back:'Volver',
    global:'Global', redditRegion:'Global · principalmente en inglés', eksiRegion:'Turquía · turco',
    redditSetting:'Busca conversaciones sobre cine y TV. No se garantiza el idioma ni encontrar un hilo del episodio.',
    eksiSetting:'Busca conversaciones sobre cine y TV en turco. Los episodios suelen compartir un tema de la serie.',
    letterboxdSetting:'Reseñas y valoraciones de películas. La disponibilidad de TV es limitada.', redditDescription:'Busca conversaciones sobre cine y TV',
    redditSearch:'Buscar: {query}', platformSaveFailed:'No se pudieron guardar las plataformas. Activa o desactiva una para reintentar.',
    settingsLoadFailed:'No se pudieron cargar tus preferencias. Comprueba tus opciones antes de navegar.',
    footer:'Solo abre una pestaña al hacer clic. Guarda idioma y plataformas; no tu historial de visionado.'
  },
  pt: {
    settings:'Configurações', back:'Voltar',
    global:'Global', redditRegion:'Global · principalmente em inglês', eksiRegion:'Turquia · turco',
    redditSetting:'Pesquise conversas sobre cinema e TV. O idioma e a existência de tópicos do episódio não são garantidos.',
    eksiSetting:'Pesquise conversas sobre cinema e TV em turco. Os episódios costumam compartilhar um tópico da série.',
    letterboxdSetting:'Resenhas e avaliações de filmes. A disponibilidade de TV é limitada.', redditDescription:'Encontre conversas sobre cinema e TV',
    redditSearch:'Pesquisar: {query}', platformSaveFailed:'Não foi possível salvar as plataformas. Ative ou desative uma para tentar novamente.',
    settingsLoadFailed:'Não foi possível carregar suas preferências. Confira as opções antes de navegar.',
    footer:'Só abre uma aba quando você clica. Salva idioma e plataformas; nenhum histórico do que você assistiu.'
  },
  it: {
    settings:'Impostazioni', back:'Indietro',
    global:'Globale', redditRegion:'Globale · prevalentemente in inglese', eksiRegion:'Turchia · turco',
    redditSetting:'Cerca discussioni su film e TV. La lingua e la presenza di discussioni sull’episodio non sono garantite.',
    eksiSetting:'Cerca discussioni su film e TV in turco. Gli episodi spesso condividono un unico argomento sulla serie.',
    letterboxdSetting:'Recensioni e valutazioni di film. La disponibilità di TV è limitata.', redditDescription:'Trova discussioni su film e TV',
    redditSearch:'Cerca: {query}', platformSaveFailed:'Impossibile salvare le piattaforme. Attivane o disattivane una per riprovare.',
    settingsLoadFailed:'Impossibile caricare le preferenze. Controlla le scelte prima di navigare.',
    footer:'Apre una scheda solo quando fai clic. Salva lingua e piattaforme; nessuna cronologia di visione.'
  },
  tr: {
    settings:'Ayarlar', back:'Geri',
    global:'Global', redditRegion:'Global · ağırlıklı İngilizce', eksiRegion:'Türkiye · Türkçe',
    redditSetting:'Film ve dizi tartışmalarını ara. Sonuçların dili ve ilgili bölüm başlığının bulunması garanti değildir.',
    eksiSetting:'Türkçe film ve dizi tartışmalarını ara. Bölümler çoğunlukla aynı dizi başlığı altında tartışılır.',
    letterboxdSetting:'Film incelemeleri ve puanlama. Dizi desteği sınırlıdır.', redditDescription:'Film ve dizi tartışmalarını bul',
    redditSearch:'Arama: {query}', platformSaveFailed:'Platform tercihleri kaydedilemedi. Tekrar denemek için bir platformu açıp kapat.',
    settingsLoadFailed:'Kayıtlı tercihler yüklenemedi. Yönlendirmeden önce seçimlerini kontrol et.',
    footer:'Yalnızca tıkladığında sekme açar. Dil ve platform tercihleri kaydedilir; izleme geçmişi tutulmaz.'
  }
};
for (const [language,catalog] of Object.entries(settingsMessages)) Object.assign(messages[language],catalog);
const platformMessages = {
  en:{platformHelp:'Choose your platforms and use the arrows to change their order.',moveUp:'Move {platform} up',moveDown:'Move {platform} down',noPlatforms:'All platforms are hidden. Enable a platform in Settings.',platformSaveFailed:'Platform settings could not be saved. Change a selection or order to retry.'},
  es:{platformHelp:'Elige tus plataformas y usa las flechas para cambiar su orden.',moveUp:'Subir {platform}',moveDown:'Bajar {platform}',noPlatforms:'Todas las plataformas están ocultas. Activa una en Ajustes.',platformSaveFailed:'No se pudieron guardar los ajustes de plataformas. Cambia una selección o el orden para reintentar.'},
  pt:{platformHelp:'Escolha suas plataformas e use as setas para mudar a ordem.',moveUp:'Mover {platform} para cima',moveDown:'Mover {platform} para baixo',noPlatforms:'Todas as plataformas estão ocultas. Ative uma nas Configurações.',platformSaveFailed:'Não foi possível salvar as configurações das plataformas. Altere uma seleção ou a ordem para tentar novamente.'},
  it:{platformHelp:'Scegli le piattaforme e usa le frecce per cambiarne l’ordine.',moveUp:'Sposta {platform} in alto',moveDown:'Sposta {platform} in basso',noPlatforms:'Tutte le piattaforme sono nascoste. Attivane una nelle Impostazioni.',platformSaveFailed:'Impossibile salvare le impostazioni delle piattaforme. Cambia una scelta o l’ordine per riprovare.'},
  tr:{platformHelp:'Platformlarını seç ve oklarla sıralamasını değiştir.',moveUp:'{platform} yukarı taşı',moveDown:'{platform} aşağı taşı',noPlatforms:'Tüm platformlar kapalı. Ayarlardan bir platformu aç.',platformSaveFailed:'Platform ayarları kaydedilemedi. Tekrar denemek için bir seçimi veya sıralamayı değiştir.'}
};
for (const [language,catalog] of Object.entries(platformMessages)) Object.assign(messages[language],catalog);
const imdbMessages = {
  en:{imdbSetting:'Movie, TV series and episode pages, ratings and reviews. Uses a matching IMDb ID when available; otherwise searches by title.',imdbDescription:'Explore movie, TV series and episode ratings',imdbDirect:'Open the identified IMDb page',imdbSearch:'Search IMDb by title',imdbEpisodeSearch:'Search IMDb by series and episode number; check the results'},
  es:{imdbSetting:'Páginas, valoraciones y reseñas de películas, series y episodios. Usa un ID de IMDb coincidente si existe; si no, busca por título.',imdbDescription:'Explora valoraciones de películas, series y episodios',imdbDirect:'Abrir la página identificada de IMDb',imdbSearch:'Buscar en IMDb por título',imdbEpisodeSearch:'Buscar por serie y número de episodio; comprueba los resultados'},
  pt:{imdbSetting:'Páginas, avaliações e resenhas de filmes, séries e episódios. Usa um ID do IMDb correspondente quando disponível; caso contrário, pesquisa pelo título.',imdbDescription:'Explore avaliações de filmes, séries e episódios',imdbDirect:'Abrir a página identificada do IMDb',imdbSearch:'Pesquisar no IMDb pelo título',imdbEpisodeSearch:'Pesquisar pela série e número do episódio; confira os resultados'},
  it:{imdbSetting:'Pagine, voti e recensioni di film, serie ed episodi. Usa un ID IMDb corrispondente se disponibile; altrimenti cerca per titolo.',imdbDescription:'Esplora i voti di film, serie ed episodi',imdbDirect:'Apri la pagina IMDb identificata',imdbSearch:'Cerca su IMDb per titolo',imdbEpisodeSearch:'Cerca per serie e numero di episodio; controlla i risultati'},
  tr:{imdbSetting:'Film, dizi ve bölüm sayfaları, puanlar ve incelemeler. Eşleşen IMDb kimliği varsa kullanır; yoksa başlıkla arar.',imdbDescription:'Film, dizi ve bölüm puanlarını incele',imdbDirect:'Tespit edilen IMDb sayfasını aç',imdbSearch:'IMDb’de başlıkla ara',imdbEpisodeSearch:'Dizi ve bölüm numarasıyla IMDb’de ara; sonuçları kontrol et'}
};
for (const [language,catalog] of Object.entries(imdbMessages)) Object.assign(messages[language],catalog);
const playerMessages = {
  en:{chooseType:'Choose the content type',sourcePlayer:'Player title'},
  es:{chooseType:'Elige el tipo de contenido',sourcePlayer:'Título del reproductor'},
  pt:{chooseType:'Escolha o tipo de conteúdo',sourcePlayer:'Título do player'},
  it:{chooseType:'Scegli il tipo di contenuto',sourcePlayer:'Titolo del lettore'},
  tr:{chooseType:'İçerik türünü seç',sourcePlayer:'Oynatıcı başlığı'}
};
const youtubeMessages = {
  en:{sourceYouTube:'YouTube video title',suggestionsLabel:'Title suggestions — check before searching',restoreVideoTitle:'Restore video title'},
  es:{sourceYouTube:'Título del vídeo de YouTube',suggestionsLabel:'Títulos sugeridos — comprueba antes de buscar',restoreVideoTitle:'Restaurar título del vídeo'},
  pt:{sourceYouTube:'Título do vídeo do YouTube',suggestionsLabel:'Sugestões de título — confira antes de pesquisar',restoreVideoTitle:'Restaurar título do vídeo'},
  it:{sourceYouTube:'Titolo del video di YouTube',suggestionsLabel:'Titoli suggeriti — controlla prima di cercare',restoreVideoTitle:'Ripristina titolo del video'},
  tr:{sourceYouTube:'YouTube video başlığı',suggestionsLabel:'Başlık önerileri — aramadan önce kontrol et',restoreVideoTitle:'Video başlığını geri getir'}
};
for (const [language,catalog] of Object.entries(youtubeMessages)) Object.assign(messages[language],catalog);
for (const [language,catalog] of Object.entries(playerMessages)) Object.assign(messages[language],catalog);
for (const catalog of Object.values(messages)) Object.freeze(catalog);
Object.freeze(messages);
function supportedLanguage(language) { return Object.hasOwn(messages, language) ? language : 'en'; }
function translate(language, key, params = {}) {
  const catalog = messages[supportedLanguage(language)];
  const value = Object.hasOwn(catalog,key) ? catalog[key] : Object.hasOwn(messages.en,key) ? messages.en[key] : '';
  return value.replace(/\{(\w+)\}/g, (_, name) => Object.hasOwn(params,name) ? String(params[name]) : `{${name}}`);
}
function applyLanguage(document, language) {
  document.documentElement.lang = supportedLanguage(language);
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = translate(language,node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.setAttribute('placeholder',translate(language,node.dataset.i18nPlaceholder));
  for (const node of document.querySelectorAll('[data-i18n-aria]')) node.setAttribute('aria-label',translate(language,node.dataset.i18nAria));
}
const AfterWatchI18n = Object.freeze({messages,supportedLanguage,translate,applyLanguage});
if (typeof module !== 'undefined' && module.exports) module.exports = AfterWatchI18n;
