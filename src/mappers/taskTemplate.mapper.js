function toResponse(template) {
  if (!template) return null;
  return {
    id: template.id,
    title: template.title,
    description: template.description || '',
    createdAt: template.createdAt,
  };
}

function toResponseList(templates) {
  return templates.map(toResponse);
}

module.exports = { toResponse, toResponseList };
