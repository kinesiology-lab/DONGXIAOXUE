export function mountAssessment({host, state, summary, save, submit}) {
  const form = document.createElement('form');
  form.className = 'functional-assessment';
  for (const [heading, entries] of [['已知病情', summary.S], ['本轮检查结果', summary.O]]) {
    const section = document.createElement('section'), title = document.createElement('h3');
    title.textContent = heading;
    section.append(title);
    const list = document.createElement('ul');
    for (const text of entries.length ? entries : ['尚未记录检查结果。']) {
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    }
    section.append(list);
    form.append(section);
  }
  const draft = {...state.assessmentDraft};
  const fields = [
    ['diagnosis', summary.O.length ? '看上面的结果，陈女士的右脚做哪件事比较困难？写出一点就可以。' : '目前知道陈女士有哪些困难，或您还想为她检查什么？写出一点就可以。'],
    ['reasoning', '哪一条记录让您这么想？（选填）']
  ];
  for (const [key, prompt] of fields) {
    const label = document.createElement('label'), input = document.createElement('textarea');
    label.textContent = prompt;
    input.name = key;
    input.rows = 3;
    input.required = key === 'diagnosis';
    input.value = draft[key] || '';
    input.addEventListener('input', () => {
      draft[key] = input.value;
      state.assessmentDraft = {...draft};
      input.setCustomValidity('');
      save();
    });
    label.append(input);
    form.append(label);
  }
  const next = document.createElement('button');
  next.type = 'submit';
  next.textContent = '记录评定，制定计划';
  form.append(next);
  form.onsubmit = event => {
    event.preventDefault();
    for (const [key] of fields) {
      if (form.elements[key].required && !form.elements[key].value.trim()) {
        form.elements[key].setCustomValidity('请写下您的判断或需补查的信息。');
        form.reportValidity();
        return;
      }
    }
    submit(Object.fromEntries(fields.map(([key]) => [key, form.elements[key].value.trim()])));
  };
  host.append(form);
}
