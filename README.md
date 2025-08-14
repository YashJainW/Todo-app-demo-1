# Hierarchical Todo App

A cross-platform hierarchical to-do application built with React Native and Expo, featuring a four-level task hierarchy (Daily, Weekly, Monthly, Yearly) with automatic parent-child completion logic.

## Features

- **Hierarchical Task Management**: Organize tasks into a 4-level structure
- **User Authentication**: Secure sign-up and login via email/password
- **Real-time Sync**: Changes sync across all devices instantly
- **Offline Support**: Full functionality without internet connection
- **File Attachments**: Attach documents and files to tasks
- **Notifications & Reminders**: Set local reminders for tasks
- **Internationalization**: Support for multiple languages (English, Spanish)
- **Modern UI**: Clean, intuitive interface with smooth animations

## Tech Stack

- **Frontend**: React Native with Expo SDK
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **State Management**: React Context API
- **Offline Support**: Local storage with sync capabilities
- **UI Components**: Custom components with modern design

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator
- Supabase account

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd TodoApp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > API to get your project URL and anon key
   - Create a `.env` file in the root directory:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   Run the following SQL in your Supabase SQL editor:

   ```sql
   -- Create the tasks table
   CREATE TABLE tasks (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
     name TEXT NOT NULL,
     description TEXT,
     type TEXT CHECK (type IN ('Daily', 'Weekly', 'Monthly', 'Yearly')) NOT NULL,
     priority INTEGER CHECK (priority >= 1 AND priority <= 5) NOT NULL,
     is_completed BOOLEAN DEFAULT false NOT NULL,
     timeframe JSONB NOT NULL,
     parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
     attachments JSONB DEFAULT '[]',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
   );

   -- Enable Row Level Security
   ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

   -- Create RLS policies
   CREATE POLICY "Users can view their own tasks" ON tasks
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert their own tasks" ON tasks
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update their own tasks" ON tasks
     FOR UPDATE USING (auth.uid() = user_id);

   CREATE POLICY "Users can delete their own tasks" ON tasks
     FOR DELETE USING (auth.uid() = user_id);

   -- Enable real-time
   ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

   -- Create indexes for better performance
   CREATE INDEX idx_tasks_user_id ON tasks(user_id);
   CREATE INDEX idx_tasks_type ON tasks(type);
   CREATE INDEX idx_tasks_timeframe ON tasks USING GIN(timeframe);
   CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);
   ```

5. **Start the development server**

   ```bash
   npm start
   ```

6. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## Project Structure

```
TodoApp/
├── app/                    # Expo Router screens
│   ├── (auth)/           # Authentication screens
│   │   ├── login.tsx     # Login screen
│   │   └── signup.tsx    # Signup screen
│   ├── (tabs)/           # Main app tabs
│   │   ├── index.tsx     # Home screen
│   │   ├── daily.tsx     # Daily tasks
│   │   ├── weekly.tsx    # Weekly goals
│   │   ├── monthly.tsx   # Monthly goals
│   │   └── yearly.tsx    # Yearly goals
│   ├── _layout.tsx       # Root layout
│   └── add-edit-task.tsx # Task form modal
├── components/            # Reusable components
├── constants/             # App constants
│   └── i18n/             # Internationalization
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   └── supabase.ts       # Supabase client
└── assets/                # Images and fonts
```

## Usage

### Creating Tasks

1. Tap the "Add Task" button on any screen
2. Fill in the task details:
   - **Name**: Required task title
   - **Description**: Optional detailed description
   - **Type**: Choose from Daily, Weekly, Monthly, or Yearly
   - **Priority**: Set priority level (1-5)
   - **Timeframe**: Select appropriate dates based on task type
   - **Parent Task**: Link to a higher-level goal (optional)
   - **Attachments**: Add files or documents

### Task Hierarchy

- **Daily Tasks**: Individual day activities
- **Weekly Goals**: Goals spanning a week
- **Monthly Goals**: Monthly objectives
- **Yearly Goals**: Long-term annual goals

Daily tasks can be linked to weekly goals, weekly to monthly, and monthly to yearly, creating a complete hierarchy.

### Task Completion

- Tap the checkbox to mark tasks as complete
- Parent tasks automatically complete when all child tasks are done
- Unchecking a task will uncheck its parent if it was auto-completed

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### App Configuration

Edit `app.json` to customize:

- App name and bundle identifier
- Icons and splash screen
- Permissions and plugins

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

### Web

```bash
npm run web
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:

- Create an issue in the GitHub repository
- Check the Expo documentation
- Review Supabase documentation

## Roadmap

- [ ] Push notifications
- [ ] Task templates
- [ ] Advanced analytics
- [ ] Team collaboration
- [ ] Calendar integration
- [ ] Dark mode support
- [ ] More language support
- [ ] Offline-first architecture improvements



