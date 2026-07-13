const parseRows = (value) => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return parsed;
    return parsed && typeof parsed === "object" ? [parsed] : [];
  } catch {
    return [];
  }
};

export const normalizePhoneNumber = (value) =>
  String(value ?? "").replace(/\D/g, "");

export const getCustomerPhoneCandidates = (record) => {
  const nestedRows = [
    ...parseRows(record?.orderdata),
    ...parseRows(record?.dailymilk_json),
  ];
  const directCandidates = [
    record?.user_mobile,
    record?.usermobile,
    record?.mobile,
    record?.phone,
    record?.phonenumber,
    record?.phoneNumber,
    record?.contactnumber,
    record?.ContactNumber,
    record?.customer_mobile,
    record?.customermobile,
    record?.customer?.mobile,
    record?.user?.mobile,
  ];
  const nestedCandidates = nestedRows.flatMap((row) => [
    row?.user_mobile,
    row?.usermobile,
    row?.mobile,
    row?.phone,
    row?.phonenumber,
    row?.contactnumber,
    row?.ContactNumber,
    row?.customer?.mobile,
    row?.user?.mobile,
  ]);

  return [...directCandidates, ...nestedCandidates]
    .map(normalizePhoneNumber)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
};

export const matchesCustomerPhone = (record, query) => {
  const normalizedQuery = normalizePhoneNumber(query);
  if (!normalizedQuery) return false;
  return getCustomerPhoneCandidates(record).some((phone) =>
    phone.includes(normalizedQuery)
  );
};
