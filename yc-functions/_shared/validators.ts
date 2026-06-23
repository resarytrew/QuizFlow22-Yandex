export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequired(value: unknown, field: string): ValidationError | null {
  if (value === undefined || value === null || value === '') {
    return { field, message: `${field} is required` };
  }
  return null;
}

export function validateString(value: unknown, field: string, maxLength = 10000): ValidationError | null {
  if (typeof value !== 'string') {
    return { field, message: `${field} must be a string` };
  }
  if (value.length > maxLength) {
    return { field, message: `${field} must not exceed ${maxLength} characters` };
  }
  return null;
}

export function validateObject(value: unknown, field: string): ValidationError | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { field, message: `${field} must be an object` };
  }
  return null;
}

export function validateArray(value: unknown, field: string): ValidationError | null {
  if (!Array.isArray(value)) {
    return { field, message: `${field} must be an array` };
  }
  return null;
}

export function validateBoolean(value: unknown, field: string): ValidationError | null {
  if (typeof value !== 'boolean') {
    return { field, message: `${field} must be a boolean` };
  }
  return null;
}

export function validateQuizData(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  const titleErr = validateString(data?.title, 'title', 500);
  if (titleErr) errors.push(titleErr);

  if (data?.description !== undefined) {
    const descErr = validateString(data.description, 'description', 5000);
    if (descErr) errors.push(descErr);
  }

  if (data?.questions !== undefined) {
    const arrErr = validateArray(data.questions, 'questions');
    if (arrErr) errors.push(arrErr);
  }

  return errors;
}

export function formatErrors(errors: ValidationError[]): string {
  return errors.map((e) => e.message).join('; ');
}
