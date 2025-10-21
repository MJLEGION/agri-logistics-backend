# Phone Number Validation Guide

Your authentication system now validates **Nigerian and Rwandan phone numbers only**.

## 📱 Valid Phone Number Formats

### Nigerian Phone Numbers

**Format**: `0xxx` or `+234xx`

- Starts with: `0` OR `+234`
- Second digit: `7`, `8`, or `9`
- Followed by 9 more digits
- Total: 11 digits (0xxx xxxxxxxx) or +234 format

**Valid Examples**:

- `08012345678`
- `07012345678`
- `09012345678`
- `+2348012345678`
- `+2347012345678`
- `0801-234-5678` (spaces/dashes are allowed, they'll be removed)
- `08 0123 4567 8` (spaces are removed automatically)

**Invalid Examples**:

- `0601234567` ❌ (starts with 06)
- `+234601234567` ❌ (second digit is 6)
- `08012345` ❌ (too short)

---

### Rwandan Phone Numbers

**Format**: `07xx` or `+250 7xx`

- Starts with: `0` OR `+250`
- Second digit: `7`
- Third digit: `8` or `9`
- Followed by 7 more digits
- Total: 10 digits (07xx xxxxxxx) or +250 format

**Valid Examples**:

- `0788123456`
- `0789123456`
- `0798123456`
- `+250788123456`
- `+250789123456`
- `0788-123-456` (spaces/dashes are removed)

**Invalid Examples**:

- `0712345678` ❌ (second digit is 1, should be 7)
- `0781234567` ❌ (third digit is 1, should be 8 or 9)
- `+250712345678` ❌ (wrong format)

---

## 🔐 Password Requirements

- Minimum 6 characters
- Recommended: Mix of uppercase, lowercase, numbers, and special characters

**Valid Examples**:

- `MyPass123!` ✅
- `agricultural@2024` ✅
- `farm2024` ✅

**Invalid Examples**:

- `1234` ❌ (too short)
- `pass` ❌ (too short)

---

## 👤 Name Requirements

- Minimum 2 characters
- Maximum 50 characters
- Can contain letters, spaces, hyphens

**Valid Examples**:

- `John Doe` ✅
- `Mary-Jane Smith` ✅
- `Chidi Okonkwo` ✅
- `Jean-Paul` ✅

**Invalid Examples**:

- `J` ❌ (only 1 character)
- (empty) ❌ (required field)

---

## 📝 Registration Example

```json
POST /api/auth/register
Content-Type: application/json

{
  "name": "Chidi Okonkwo",
  "phone": "08012345678",
  "password": "MyPassword123!",
  "role": "farmer"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "_id": "...",
    "name": "Chidi Okonkwo",
    "phone": "08012345678",
    "role": "farmer"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

## 🔑 Login Example

```json
POST /api/auth/login
Content-Type: application/json

{
  "phone": "08012345678",
  "password": "MyPassword123!"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Welcome back, Chidi Okonkwo!",
  "user": {
    "_id": "...",
    "name": "Chidi Okonkwo",
    "phone": "08012345678",
    "role": "farmer"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

## 🛡️ Security Features

1. **Phone Validation**: Only Nigeria (+234) and Rwanda (+250) numbers
2. **Account Lockout**: After 5 failed login attempts, account locks for 15 minutes
3. **Password Hashing**: bcryptjs with salt rounds
4. **Token Expiration**: Access tokens expire in 1 hour, refresh tokens in 7 days
5. **Failed Attempt Tracking**: Monitors and logs failed login attempts

---

## ⚠️ Error Messages

| Scenario                 | Error Message                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Invalid phone format     | `Invalid phone number format. Please use Nigerian (0801-0809, +234...) or Rwandan (+250 7xx...) format` |
| Phone already registered | `This phone number is already registered`                                                               |
| Account locked           | `Account locked due to multiple failed login attempts. Try again in X minutes`                          |
| Wrong password           | `Invalid phone number or password. X attempts remaining`                                                |
| Short password           | `Password must be at least 6 characters long`                                                           |

---

## 🌍 Future Expansion

To add more countries in the future, update the validation regex in:

- `src/models/user.js` (phone validation function)
- `src/controllers/authController.js` (register & login methods)

Current patterns:

```javascript
const nigerianRegex = /^(\+234|0)[789]\d{9}$/;
const rwandanRegex = /^(\+250|0)7[8-9]\d{7}$/;
```
