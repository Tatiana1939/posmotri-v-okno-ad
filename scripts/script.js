/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;

/* ЭЛЕМЕНТЫ СТРАНИЦЫ */
const cardsList = document.querySelector('.content__list');
const cardsContainer = document.querySelector('.content__list-container');
const videoContainer = document.querySelector('.result__video-container');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('form');

/* ТЕМПЛЕЙТЫ */
const cardTmp = document.querySelector('.cards-list-item-template');
const preloaderTmp = document.querySelector('.preloader-template');
const videoNotFoundTmp = document.querySelector('.error-template');
const moreButtonTmp = document.querySelector('.more-button-template');

/* МЕХАНИКА */

// Нужен для работы с переключателями
let cardsOnPageState = [];

let searchController;
let paginationController;
// Первая загрузка ✅

showPreloader(preloaderTmp, videoContainer);
showPreloader(preloaderTmp, cardsContainer);
mainMechanics(endpoint);

// осуществляется поиск ✅
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (paginationController) {
    paginationController.abort();
    paginationController = null;
  }

  cardsList.textContent = '';

  const buttonInDOM = cardsContainer.querySelector('.more-button');

  if (buttonInDOM) {
    buttonInDOM.remove();
  }

  [...videoContainer.children].forEach((el) => {
    if (el.classList.contains('error')) {
      el.remove();
    }
  });

  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);

  const formData = serializeFormData(form);

  const requestUrl = generateFilterRequest(
    endpoint,
    formData.city,
    formData.timeArray
  );
  console.log('URL ПОИСКА:', requestUrl);
  mainMechanics(requestUrl);
});


/* ФУНКЦИЯ, КОТОРАЯ ВСЕ ГЕНЕРИТ */

async function mainMechanics(endpoint) {
  if (searchController) {
    searchController.abort();
  }

  searchController = new AbortController();

  try {
    const response = await fetch(endpoint, {
      signal: searchController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    cardsOnPageState = data.results;

    if (!data?.results?.[0]) {
      throw new Error('not-found');
    }

    appendCards({
      baseUrl: BASE_URL,
      dataArray: data.results,
      cardTmp,
      container: cardsList,
    });

    setVideo({
      baseUrl: BASE_URL,
      video: videoElement,
      videoUrl: data.results[0].video.url,
      posterUrl: data.results[0].poster.url,
    });
    document
      .querySelectorAll('.content__card-link')[0]
      .classList.add('content__card-link_current');
    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');

    // Добавляем класс для стилизации скроллбара
    cardsContainer.classList.add('custom-scrollbar');

    chooseCurrentVideo({
      baseUrl: BASE_URL,
      videoData: cardsOnPageState,
      cardLinksSelector: '.content__card-link',
      currentLinkClassName: 'content__card-link_current',
      mainVideo: videoElement,
    });

    showMoreCards({
      dataArray: data,
      buttonTemplate: moreButtonTmp,
      cardsList,
      buttonSelector: '.more-button',
      initialEndpoint: endpoint,
      baseUrl: BASE_URL,
      cardTmp: cardTmp,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return;
    }
    if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'Нет подходящих видео =(');
    } else {
      showError(videoContainer, videoNotFoundTmp, 'Ошибка получения данных :(');
    }
    console.log(err);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');
  }
}

/* УТИЛИТЫ */

// Простой промис, чтобы легче ставить паузу ✅

async function delay(ms) {
  return await new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
}

// Промис, который резолвится, если видео целиком готово к проинрыванию без пауз


function waitForReadyVideo(video) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Превышено время ожидания загрузки видео'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      video.removeEventListener('canplay', handleReady);
      video.removeEventListener('error', handleError);
    }

    function handleReady() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new Error('Не удалось загрузить видео'));
    }

    video.addEventListener('canplay', handleReady);
    video.addEventListener('error', handleError);

    video.load();

    if (video.readyState >= 3) {
      cleanup();
      resolve();
    }
  });
}

// Устанавливает прелоадер на время загрузки данных ✅
function showPreloader(tmp, parent) {
  removePreloader(parent, '.preloader');

  const node = tmp.content.cloneNode(true);
  parent.append(node);
}

// Убирает прелоадер из DOM ✅
function removePreloader(parent, preloaderSelector) {
  parent.querySelectorAll(preloaderSelector).forEach((preloader) => {
    preloader.remove();
  });
}

// Добавляет карточки в контейнер, собирая их из данных API ✅
function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);
    node.querySelector('a').setAttribute('id', el.id);
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent =
      el.description;
    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('src', `${baseUrl}${el.thumbnail.url}`);
    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('alt', el.description);
    container.append(node);
  });
  console.log('Сгенерировал карточки');
}

// Устанавливет внужное видео в контейнер ✅
function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.setAttribute('src', `${baseUrl}${videoUrl}`);
  video.setAttribute('poster', `${baseUrl}${posterUrl}`);
  console.log('Подставил видео в основной блок');
}

// получает данные из формы и сериализует как надо ✅

function serializeFormData(form) {
  const city = form.querySelector('input[name="city"]');
  const checkboxes = form.querySelectorAll('input[name="time"]');
  const checkedValuesArray = [...checkboxes].reduce((acc, item) => {
    item.checked && acc.push(item.value);
    return acc;
  }, []);
  console.log('Собрал данные формы в объект');
  return {
    city: city.value,
    timeArray: checkedValuesArray,
  };
}

// Генерирует строку с фильтрами запросов в API в зависимости от данных из формы ✅
function generateFilterRequest(endpoint, city, timeArray) {
  const params = new URLSearchParams();

  const normalizedCity = city.trim();

  if (normalizedCity) {
    params.append(
      'filters[city][$containsi]',
      normalizedCity
    );
  }

  if (timeArray.length > 0) {
    timeArray.forEach((timeslot, index) => {
      params.append(
        `filters[time_of_day][$in][${index}]`,
        timeslot
      );
    });
  }

  const query = params.toString();

  return query ? `${endpoint}${query}` : endpoint;
}

// переключает текущее видео ✅

function chooseCurrentVideo({
  baseUrl,
  videoData,
  cardLinksSelector,
  currentLinkClassName,
  mainVideo,
}) {
  const cardLinks = document.querySelectorAll(cardLinksSelector);

  cardLinks.forEach((link) => {
    link.onclick = async (event) => {
      event.preventDefault();

      const selectedVideo = videoData.find(
        (video) => String(video.id) === String(link.id)
      );

      if (!selectedVideo) {
        return;
      }

      cardLinks.forEach((cardLink) => {
        cardLink.classList.remove(currentLinkClassName);
      });

      link.classList.add(currentLinkClassName);

      removePreloader(videoContainer, '.preloader');
      showPreloader(preloaderTmp, videoContainer);

      const previousError = videoContainer.querySelector('.error');

      if (previousError) {
        previousError.remove();
      }

      try {
        setVideo({
          baseUrl,
          video: mainVideo,
          videoUrl: selectedVideo.video.url,
          posterUrl: selectedVideo.poster.url,
        });

        mainVideo.load();

        await waitForReadyVideo(mainVideo);

        mainVideo.play().catch(() => {
          // Браузер может запрещать автоматическое воспроизведение.
        });
      } catch (error) {
        console.error('Ошибка переключения видео:', error);

        showError(
          videoContainer,
          videoNotFoundTmp,
          'Не удалось загрузить видео :('
        );
      } finally {
        removePreloader(videoContainer, '.preloader');
      }
    };
  });
}


// вывожу интерфейс, когда видео не найдено ✅
function showError(container, errorTemplate, errorMessage) {
  const node = errorTemplate.content.cloneNode(true);
  node.querySelector('.error__title').textContent = errorMessage;
  container.append(node);
  console.log('показал, ошибку');
}

// вывожу больше видео, если в пагинации больше страниц, чем показано


function showMoreCards({
  dataArray,
  buttonTemplate,
  cardsList,
  buttonSelector,
  initialEndpoint,
  baseUrl,
  cardTmp,
}) {
  const { page, pageCount } = dataArray.pagination;

  // Если следующей страницы нет, кнопку не показываем.
  if (page >= pageCount) {
    return;
  }

  // Создаём кнопку.
  const buttonNode = buttonTemplate.content.cloneNode(true);
  cardsContainer.append(buttonNode);

  const buttonInDOM = cardsContainer.querySelector(buttonSelector);

  buttonInDOM.addEventListener('click', async () => {
    // Защита от повторных нажатий.
    if (buttonInDOM.disabled) {
      return;
    }

    buttonInDOM.disabled = true;
    buttonInDOM.textContent = 'Загрузка...';

    try {
      const nextPage = page + 1;

      const urlToFetch =
        `${initialEndpoint}pagination[page]=${nextPage}`;

      paginationController = new AbortController();

      const response = await fetch(urlToFetch, {
        signal: paginationController.signal,
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error('Некорректный ответ сервера');
      }

      // Добавляем новые данные к уже загруженным.
      cardsOnPageState = cardsOnPageState.concat(data.results);

      // Добавляем карточки в список.
      appendCards({
        baseUrl,
        dataArray: data.results,
        cardTmp,
        container: cardsList,
      });

      // Удаляем старую кнопку.
      buttonInDOM.remove();

      // Обновляем обработчики переключения видео.
      chooseCurrentVideo({
        baseUrl,
        videoData: cardsOnPageState,
        cardLinksSelector: '.content__card-link',
        currentLinkClassName: 'content__card-link_current',
        mainVideo: videoElement,
      });

      // Показываем кнопку для следующей страницы,
      // если она существует.
      showMoreCards({
        dataArray: data,
        buttonTemplate,
        cardsList,
        buttonSelector,
        initialEndpoint,
        baseUrl,
        cardTmp,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Не удалось загрузить следующие карточки:', error);

      buttonInDOM.disabled = false;
      buttonInDOM.textContent = 'Попробовать ещё раз';
    }
  });
}

