import { ErrorCode, ValidationError } from '../types/api';

// Validation utility functions
export class ValidationUtils {
  static validateEmail(email: string): ValidationError | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return { field: 'email', message: 'Email is required', code: ErrorCode.MISSING_REQUIRED_FIELD };
    }
    if (!emailRegex.test(email)) {
      return { field: 'email', message: 'Invalid email format', code: ErrorCode.INVALID_EMAIL };
    }
    return null;
  }

  static validatePassword(password: string): ValidationError | null {
    if (!password) {
      return { field: 'password', message: 'Password is required', code: ErrorCode.MISSING_REQUIRED_FIELD };
    }
    if (password.length < 8) {
      return { field: 'password', message: 'Password must be at least 8 characters', code: ErrorCode.WEAK_PASSWORD };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { field: 'password', message: 'Password must contain uppercase, lowercase, and number', code: ErrorCode.WEAK_PASSWORD };
    }
    return null;
  }

  static validateRequired(value: any, field: string): ValidationError | null {
    if (value === undefined || value === null || value === '') {
      return { field, message: `${field} is required`, code: ErrorCode.MISSING_REQUIRED_FIELD };
    }
    return null;
  }

  static validateString(value: string, field: string, minLength = 1, maxLength = 255): ValidationError | null {
    const required = this.validateRequired(value, field);
    if (required) return required;

    if (typeof value !== 'string') {
      return { field, message: `${field} must be a string`, code: ErrorCode.INVALID_FORMAT };
    }
    if (value.length < minLength) {
      return { field, message: `${field} must be at least ${minLength} characters`, code: ErrorCode.INVALID_FORMAT };
    }
    if (value.length > maxLength) {
      return { field, message: `${field} must be no more than ${maxLength} characters`, code: ErrorCode.INVALID_FORMAT };
    }
    return null;
  }

  static validateArray(value: any[], field: string, maxItems = 100): ValidationError | null {
    if (!Array.isArray(value)) {
      return { field, message: `${field} must be an array`, code: ErrorCode.INVALID_FORMAT };
    }
    if (value.length > maxItems) {
      return { field, message: `${field} cannot have more than ${maxItems} items`, code: ErrorCode.INVALID_FORMAT };
    }
    return null;
  }

  static validateEnum<T extends string>(value: T, field: string, allowedValues: T[]): ValidationError | null {
    if (!allowedValues.includes(value)) {
      return { 
        field, 
        message: `${field} must be one of: ${allowedValues.join(', ')}`, 
        code: ErrorCode.INVALID_FORMAT 
      };
    }
    return null;
  }

  static validateDate(value: string, field: string): ValidationError | null {
    if (!value) return null; // Optional field
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { field, message: `${field} must be a valid date`, code: ErrorCode.INVALID_FORMAT };
    }
    return null;
  }

  static validatePosition(position: number, field = 'position'): ValidationError | null {
    if (typeof position !== 'number' || position < 0) {
      return { field, message: `${field} must be a non-negative number`, code: ErrorCode.INVALID_FORMAT };
    }
    return null;
  }

  static validateId(id: string, field = 'id'): ValidationError | null {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return { field, message: `${field} must be a valid ID`, code: ErrorCode.INVALID_FORMAT };
    }
    return null;
  }

  static validateNumber(value: number, field: string, min = 0): ValidationError | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return { field, message: `${field} must be a valid number`, code: ErrorCode.INVALID_FORMAT };
    }
    if (value < min) {
      return { field, message: `${field} must be at least ${min}`, code: ErrorCode.INVALID_FORMAT };
    }
    return null;
  }

  static validateBoolean(value: boolean, field: string): ValidationError | null {
    if (typeof value !== 'boolean') {
      return { field, message: `${field} must be a boolean`, code: ErrorCode.INVALID_FORMAT };
    }
    return null;
  }
}

// Request validation schemas
export const UserValidation = {
  create: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const emailError = ValidationUtils.validateEmail(data.email);
    if (emailError) errors.push(emailError);
    
    const passwordError = ValidationUtils.validatePassword(data.password);
    if (passwordError) errors.push(passwordError);
    
    const nameError = ValidationUtils.validateString(data.name, 'name', 2, 50);
    if (nameError) errors.push(nameError);
    
    return errors;
  },

  update: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (data.name !== undefined) {
      const nameError = ValidationUtils.validateString(data.name, 'name', 2, 50);
      if (nameError) errors.push(nameError);
    }
    
    if (data.email !== undefined) {
      const emailError = ValidationUtils.validateEmail(data.email);
      if (emailError) errors.push(emailError);
    }
    
    return errors;
  }
};

export const WorkspaceValidation = {
  create: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const nameError = ValidationUtils.validateString(data.name, 'name', 2, 100);
    if (nameError) errors.push(nameError);
    
    if (data.description !== undefined) {
      const descError = ValidationUtils.validateString(data.description, 'description', 0, 500);
      if (descError) errors.push(descError);
    }
    
    return errors;
  },

  update: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (data.name !== undefined) {
      const nameError = ValidationUtils.validateString(data.name, 'name', 2, 100);
      if (nameError) errors.push(nameError);
    }
    
    if (data.description !== undefined) {
      const descError = ValidationUtils.validateString(data.description, 'description', 0, 500);
      if (descError) errors.push(descError);
    }
    
    return errors;
  }
};

export const BoardValidation = {
  create: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const titleError = ValidationUtils.validateString(data.title, 'title', 1, 100);
    if (titleError) errors.push(titleError);
    
    if (data.description !== undefined) {
      const descError = ValidationUtils.validateString(data.description, 'description', 0, 500);
      if (descError) errors.push(descError);
    }
    
    if (data.visibility !== undefined) {
      const visError = ValidationUtils.validateEnum(data.visibility, 'visibility', ['private', 'workspace', 'public']);
      if (visError) errors.push(visError);
    }
    
    return errors;
  },

  update: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (data.title !== undefined) {
      const titleError = ValidationUtils.validateString(data.title, 'title', 1, 100);
      if (titleError) errors.push(titleError);
    }
    
    if (data.description !== undefined) {
      const descError = ValidationUtils.validateString(data.description, 'description', 0, 500);
      if (descError) errors.push(descError);
    }
    
    if (data.visibility !== undefined) {
      const visError = ValidationUtils.validateEnum(data.visibility, 'visibility', ['private', 'workspace', 'public']);
      if (visError) errors.push(visError);
    }
    
    return errors;
  }
};

export const ListValidation = {
  create: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const titleError = ValidationUtils.validateString(data.title, 'title', 1, 100);
    if (titleError) errors.push(titleError);
    
    if (data.position !== undefined) {
      const posError = ValidationUtils.validatePosition(data.position);
      if (posError) errors.push(posError);
    }
    
    return errors;
  },

  update: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (data.title !== undefined) {
      const titleError = ValidationUtils.validateString(data.title, 'title', 1, 100);
      if (titleError) errors.push(titleError);
    }
    
    if (data.position !== undefined) {
      const posError = ValidationUtils.validatePosition(data.position);
      if (posError) errors.push(posError);
    }
    
    return errors;
  }
};

export const CardValidation = {
  create: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const titleError = ValidationUtils.validateString(data.title, 'title', 1, 200);
    if (titleError) errors.push(titleError);
    
    if (data.description !== undefined) {
      const descError = ValidationUtils.validateString(data.description, 'description', 0, 2000);
      if (descError) errors.push(descError);
    }
    
    if (data.assignedTo !== undefined) {
      const assignError = ValidationUtils.validateArray(data.assignedTo, 'assignedTo', 10);
      if (assignError) errors.push(assignError);
    }
    
    if (data.labels !== undefined) {
      const labelError = ValidationUtils.validateArray(data.labels, 'labels', 20);
      if (labelError) errors.push(labelError);
    }
    
    if (data.dueDate !== undefined) {
      const dateError = ValidationUtils.validateDate(data.dueDate, 'dueDate');
      if (dateError) errors.push(dateError);
    }
    
    if (data.priority !== undefined) {
      const priorityError = ValidationUtils.validateEnum(data.priority, 'priority', ['low', 'medium', 'high']);
      if (priorityError) errors.push(priorityError);
    }
    
    if (data.position !== undefined) {
      const posError = ValidationUtils.validatePosition(data.position);
      if (posError) errors.push(posError);
    }
    
    return errors;
  },

  update: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (data.title !== undefined) {
      const titleError = ValidationUtils.validateString(data.title, 'title', 1, 200);
      if (titleError) errors.push(titleError);
    }
    
    if (data.description !== undefined) {
      const descError = ValidationUtils.validateString(data.description, 'description', 0, 2000);
      if (descError) errors.push(descError);
    }
    
    if (data.assignedTo !== undefined) {
      const assignError = ValidationUtils.validateArray(data.assignedTo, 'assignedTo', 10);
      if (assignError) errors.push(assignError);
    }
    
    if (data.labels !== undefined) {
      const labelError = ValidationUtils.validateArray(data.labels, 'labels', 20);
      if (labelError) errors.push(labelError);
    }
    
    if (data.dueDate !== undefined) {
      const dateError = ValidationUtils.validateDate(data.dueDate, 'dueDate');
      if (dateError) errors.push(dateError);
    }
    
    if (data.priority !== undefined) {
      const priorityError = ValidationUtils.validateEnum(data.priority, 'priority', ['low', 'medium', 'high']);
      if (priorityError) errors.push(priorityError);
    }
    
    if (data.position !== undefined) {
      const posError = ValidationUtils.validatePosition(data.position);
      if (posError) errors.push(posError);
    }
    
    return errors;
  },

  move: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const listIdError = ValidationUtils.validateId(data.targetListId, 'targetListId');
    if (listIdError) errors.push(listIdError);
    
    const posError = ValidationUtils.validatePosition(data.position);
    if (posError) errors.push(posError);
    
    return errors;
  }
};

export const CommentValidation = {
  create: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const textError = ValidationUtils.validateString(data.text, 'text', 1, 1000);
    if (textError) errors.push(textError);
    
    return errors;
  },

  update: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const textError = ValidationUtils.validateString(data.text, 'text', 1, 1000);
    if (textError) errors.push(textError);
    
    return errors;
  }
};

export const ActivityValidation = {
  create: (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const typeError = ValidationUtils.validateString(data.type, 'type', 1, 50);
    if (typeError) errors.push(typeError);
    
    const descError = ValidationUtils.validateString(data.description, 'description', 1, 500);
    if (descError) errors.push(descError);
    
    if (data.boardId !== undefined) {
      const boardIdError = ValidationUtils.validateId(data.boardId, 'boardId');
      if (boardIdError) errors.push(boardIdError);
    }
    
    if (data.entityId !== undefined) {
      const entityIdError = ValidationUtils.validateId(data.entityId, 'entityId');
      if (entityIdError) errors.push(entityIdError);
    }
    
    if (data.entityType !== undefined) {
      const entityTypeError = ValidationUtils.validateEnum(data.entityType, 'entityType', ['card', 'list', 'board', 'comment']);
      if (entityTypeError) errors.push(entityTypeError);
    }
    
    return errors;
  }
};

