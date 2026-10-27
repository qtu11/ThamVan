const form = document.querySelector('#photo-filters');
const gallery = document.querySelector('.gallery');
const status = document.querySelector('#result-count');
const pager = document.querySelector('#pagination');
const heading = document.querySelector('#gallery-title');
const fold = (value) =>
  String(value || '')
    .toLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};
let rows = [],
  page = 1;
const pageSize = 24;

function render() {
  const query = fold(form.elements.query.value.trim()),
    category = form.elements.category.value,
    state = form.elements.state.value;
  const filtered = rows.filter(
    (row) =>
      (!query || fold(`${row.id} ${row.name} ${row.address}`).includes(query)) &&
      (!category || row.category === category) &&
      (state === 'all' || (state === 'photos' ? !!row.image : !row.image)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages);
  const start = (page - 1) * pageSize;
  const fragment = document.createDocumentFragment();
  for (const row of filtered.slice(start, start + pageSize)) {
    const card = element('article');
    if (row.image && /^\/images\/[a-z0-9-]+\.(jpg|jpeg|webp|png)$/.test(row.image)) {
      const image = element('img');
      image.src = row.image;
      image.alt = row.name;
      image.width = 600;
      image.height = 400;
      image.loading = 'lazy';
      card.append(image);
    } else card.append(element('div', 'Chưa có ảnh địa điểm', 'missing-photo'));
    const body = element('div');
    body.append(element('small', row.id));
    body.append(element('h3', row.name));
    body.append(element('p', row.address));
    body.append(element('p', row.category, 'category'));
    if (row.image) {
      const a = row.attribution;
      if (a?.author) body.append(element('p', `Ảnh: ${a.author}`, 'credit'));
      body.append(element('p', a?.license || 'Quyền sử dụng: cần bổ sung', 'credit'));
      if (/^https:\/\//.test(row.source || '')) {
        const link = element('a', 'Xem trang nguồn ↗');
        link.href = row.source;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        body.append(link);
      }
      body.append(
        element(
          'p',
          row.status === 'VERIFIED_PHOTO'
            ? 'Đã duyệt danh tính và nguồn'
            : 'Cần duyệt trước khi xuất bản',
          'review-state',
        ),
      );
    }
    card.append(body);
    fragment.append(card);
  }
  gallery.replaceChildren(fragment);
  if (!filtered.length)
    gallery.append(element('p', 'Không có địa điểm phù hợp. Hãy thử tên hoặc nhóm khác.', 'empty'));
  heading.textContent =
    state === 'all'
      ? 'Toàn bộ địa điểm'
      : state === 'photos'
        ? 'Ảnh đã bổ sung'
        : 'Địa điểm cần bổ sung ảnh';
  status.textContent = `${filtered.length.toLocaleString('vi-VN')} địa điểm · Trang ${page}/${pages}`;
  const previous = element('button', '← Trang trước');
  previous.type = 'button';
  previous.disabled = page === 1;
  previous.addEventListener('click', () => {
    page--;
    render();
    heading.scrollIntoView({ block: 'start' });
  });
  const next = element('button', 'Trang sau →');
  next.type = 'button';
  next.disabled = page === pages;
  next.addEventListener('click', () => {
    page++;
    render();
    heading.scrollIntoView({ block: 'start' });
  });
  pager.replaceChildren(previous, element('span', `${page} / ${pages}`), next);
}

try {
  const response = await fetch('../thamvan-image-index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Cannot load index');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Invalid index');
  rows = data;
  const categories = [...new Set(rows.map((row) => row.category))].sort((a, b) =>
    a.localeCompare(b, 'vi'),
  );
  for (const category of categories) {
    const option = element('option', category);
    option.value = category;
    form.elements.category.append(option);
  }
  form.hidden = false;
  form.addEventListener('input', () => {
    page = 1;
    render();
  });
  form.addEventListener('submit', (event) => event.preventDefault());
  render();
  document.documentElement.dataset.galleryReady = 'true';
} catch {
  status.textContent =
    'Đang hiển thị bản danh sách tĩnh. Bạn vẫn có thể xem ảnh và tải CSV bên dưới.';
}
