// Sample TypeScript file for testing
interface User {
  id: number;
  name: string;
  email: string;
}

type UserRole = 'admin' | 'user' | 'guest';

class UserService {
  private users: Map<number, User> = new Map();

  constructor(private readonly apiUrl: string) {}

  async getUser(id: number): Promise<User | null> {
    const cached = this.users.get(id);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.apiUrl}/users/${id}`);
      const user = (await response.json()) as User;
      this.users.set(id, user);
      return user;
    } catch (error) {
      console.error(`Failed to fetch user ${id}:`, error);
      return null;
    }
  }

  createUser(data: Omit<User, 'id'>): User {
    const id = Date.now();
    const user: User = { id, ...data };
    this.users.set(id, user);
    return user;
  }
}

// Generic function
function identity<T>(value: T): T {
  return value;
}

// Enum example
enum Status {
  Pending = 'PENDING',
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}

export { UserService, User, UserRole, identity, Status };
