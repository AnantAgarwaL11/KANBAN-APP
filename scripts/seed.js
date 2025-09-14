#!/usr/bin/env node

/**
 * Seed Script for Mini-Trello Kanban App
 * Creates sample data for development and testing
 */

const { create, find } = require('../src/utils/mockDatabase');
const { 
  USERS_COLLECTION, 
  BOARDS_COLLECTION, 
  LISTS_COLLECTION, 
  CARDS_COLLECTION 
} = require('../src/utils/constants');
const bcrypt = require('bcryptjs');

// Sample data
const sampleUsers = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    name: 'John Doe',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  {
    email: 'jane.smith@example.com',
    password: 'password123',
    name: 'Jane Smith',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
  },
  {
    email: 'mike.wilson@example.com',
    password: 'password123',
    name: 'Mike Wilson',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  }
];

const sampleBoards = [
  {
    title: 'Product Development',
    bgcolor: '#0079bf',
    isPublic: false,
    description: 'Main product development board for tracking features and bugs'
  },
  {
    title: 'Marketing Campaign',
    bgcolor: '#d29034',
    isPublic: true,
    description: 'Q4 marketing campaign planning and execution'
  },
  {
    title: 'Team Onboarding',
    bgcolor: '#519839',
    isPublic: false,
    description: 'New team member onboarding process and tasks'
  }
];

const sampleLists = [
  // Product Development Board Lists
  { title: 'Backlog', position: 0 },
  { title: 'In Progress', position: 1 },
  { title: 'Code Review', position: 2 },
  { title: 'Testing', position: 3 },
  { title: 'Done', position: 4 },
  
  // Marketing Campaign Board Lists
  { title: 'Ideas', position: 0 },
  { title: 'Planning', position: 1 },
  { title: 'In Progress', position: 2 },
  { title: 'Review', position: 3 },
  { title: 'Published', position: 4 },
  
  // Team Onboarding Board Lists
  { title: 'New Hires', position: 0 },
  { title: 'Documentation', position: 1 },
  { title: 'Training', position: 2 },
  { title: 'Mentoring', position: 3 },
  { title: 'Completed', position: 4 }
];

const sampleCards = [
  // Product Development Cards
  {
    title: 'Implement user authentication',
    description: '## Overview\nAdd secure user authentication with email/password and social login options.\n\n## Requirements\n- Email/password login\n- Password reset functionality\n- Social login (Google, GitHub)\n- Session management\n\n## Acceptance Criteria\n- [ ] User can register with email\n- [ ] User can login with credentials\n- [ ] Password reset via email\n- [ ] Social login integration',
    position: 0,
    labels: ['Backend', 'Security'],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    priority: 'high'
  },
  {
    title: 'Design system components',
    description: '## Task\nCreate reusable UI components following design system guidelines.\n\n## Components Needed\n- Buttons (primary, secondary, danger)\n- Form inputs\n- Cards\n- Modals\n- Navigation\n\n## Notes\nEnsure accessibility compliance (WCAG 2.1)',
    position: 1,
    labels: ['Frontend', 'Design'],
    priority: 'medium'
  },
  {
    title: 'API documentation',
    description: 'Create comprehensive API documentation using OpenAPI/Swagger specification.',
    position: 0,
    labels: ['Documentation'],
    priority: 'low'
  },
  {
    title: 'Database optimization',
    description: '## Performance Issues\nOptimize database queries and add proper indexing.\n\n## Tasks\n- [ ] Analyze slow queries\n- [ ] Add database indexes\n- [ ] Implement query caching\n- [ ] Performance testing',
    position: 0,
    labels: ['Backend', 'Performance'],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    priority: 'high'
  },
  {
    title: 'Mobile responsive design',
    description: 'Ensure the application works well on mobile devices and tablets.',
    position: 1,
    labels: ['Frontend', 'Mobile'],
    priority: 'medium'
  },

  // Marketing Campaign Cards
  {
    title: 'Social media strategy',
    description: '## Objective\nDevelop comprehensive social media strategy for Q4 campaign.\n\n## Platforms\n- Twitter\n- LinkedIn\n- Instagram\n- Facebook\n\n## Deliverables\n- Content calendar\n- Posting schedule\n- Engagement metrics',
    position: 0,
    labels: ['Strategy', 'Social Media'],
    priority: 'high'
  },
  {
    title: 'Blog post series',
    description: 'Create 5-part blog post series about product features and benefits.',
    position: 1,
    labels: ['Content', 'Blog'],
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
    priority: 'medium'
  },
  {
    title: 'Email campaign design',
    description: '## Requirements\nDesign email templates for the marketing campaign.\n\n## Templates Needed\n- Welcome email\n- Feature announcement\n- Newsletter template\n- Promotional email',
    position: 0,
    labels: ['Design', 'Email'],
    priority: 'medium'
  },

  // Team Onboarding Cards
  {
    title: 'Sarah Johnson - Frontend Developer',
    description: '## New Hire Details\n- Start Date: Next Monday\n- Role: Senior Frontend Developer\n- Team: Product Development\n- Mentor: John Doe\n\n## Onboarding Checklist\n- [ ] Send welcome email\n- [ ] Prepare workspace\n- [ ] Schedule first day meeting\n- [ ] Assign mentor',
    position: 0,
    labels: ['New Hire', 'Frontend'],
    priority: 'high'
  },
  {
    title: 'Update onboarding documentation',
    description: 'Review and update the team onboarding documentation based on recent feedback.',
    position: 0,
    labels: ['Documentation'],
    priority: 'medium'
  },
  {
    title: 'Setup development environment guide',
    description: '## Task\nCreate step-by-step guide for setting up local development environment.\n\n## Include\n- Required software installation\n- Repository setup\n- Environment variables\n- Database setup\n- Testing setup',
    position: 1,
    labels: ['Documentation', 'Development'],
    priority: 'high'
  }
];

// Utility functions
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Seed functions
const seedUsers = async () => {
  console.log('🌱 Seeding users...');
  const userIds = [];
  
  for (const userData of sampleUsers) {
    const hashedPassword = await hashPassword(userData.password);
    const userId = await create(USERS_COLLECTION, {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      preferences: {
        theme: 'light',
        notifications: true,
        defaultBoardColor: '#0079bf'
      }
    });
    userIds.push(userId);
    console.log(`   ✓ Created user: ${userData.name} (${userData.email})`);
  }
  
  return userIds;
};

const seedBoards = async (userIds) => {
  console.log('🌱 Seeding boards...');
  const boardIds = [];
  
  for (let i = 0; i < sampleBoards.length; i++) {
    const boardData = sampleBoards[i];
    const authorId = userIds[i % userIds.length];
    
    const boardId = await create(BOARDS_COLLECTION, {
      ...boardData,
      author: authorId,
      members: [authorId, ...userIds.filter(id => id !== authorId).slice(0, 2)], // Add 2 other members
      createdAt: new Date(),
      settings: {
        allowComments: true,
        cardCover: true,
        voting: false
      }
    });
    
    boardIds.push(boardId);
    console.log(`   ✓ Created board: ${boardData.title}`);
  }
  
  return boardIds;
};

const seedLists = async (boardIds) => {
  console.log('🌱 Seeding lists...');
  const listIds = [];
  
  let listIndex = 0;
  for (let boardIndex = 0; boardIndex < boardIds.length; boardIndex++) {
    const boardId = boardIds[boardIndex];
    
    // Create 5 lists per board
    for (let i = 0; i < 5; i++) {
      const listData = sampleLists[listIndex];
      const listId = await create(LISTS_COLLECTION, {
        ...listData,
        boardId,
        archived: false,
        createdAt: new Date(),
        settings: {
          wipLimit: i === 1 ? 3 : undefined, // Set WIP limit for "In Progress" lists
          autoArchive: false
        }
      });
      
      listIds.push({ id: listId, boardId, position: listData.position });
      listIndex++;
    }
    
    console.log(`   ✓ Created 5 lists for board ${boardIndex + 1}`);
  }
  
  return listIds;
};

const seedCards = async (listIds, userIds) => {
  console.log('🌱 Seeding cards...');
  
  let cardIndex = 0;
  for (let boardIndex = 0; boardIndex < 3; boardIndex++) {
    const boardLists = listIds.filter(list => 
      listIds.indexOf(list) >= boardIndex * 5 && 
      listIds.indexOf(list) < (boardIndex + 1) * 5
    );
    
    // Distribute cards across lists for this board
    const cardsPerBoard = boardIndex === 0 ? 5 : (boardIndex === 1 ? 3 : 3);
    
    for (let i = 0; i < cardsPerBoard; i++) {
      const cardData = sampleCards[cardIndex];
      const targetList = boardLists[i % boardLists.length];
      const assignedUsers = userIds.slice(0, Math.floor(Math.random() * 2) + 1); // 1-2 assigned users
      
      await create(CARDS_COLLECTION, {
        ...cardData,
        listId: targetList.id,
        assignedTo: assignedUsers,
        archived: false,
        createdAt: new Date(),
        attachments: [],
        checklist: cardData.title.includes('authentication') ? [
          {
            id: generateId(),
            text: 'Research authentication libraries',
            completed: true,
            assignedTo: assignedUsers[0]
          },
          {
            id: generateId(),
            text: 'Implement login form',
            completed: false,
            assignedTo: assignedUsers[0]
          },
          {
            id: generateId(),
            text: 'Add password validation',
            completed: false
          }
        ] : [],
        comments: cardData.title.includes('design') ? [
          {
            id: generateId(),
            text: 'Great idea! Let\'s make sure we follow the accessibility guidelines.',
            userId: userIds[1],
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
          },
          {
            id: generateId(),
            text: 'I\'ll start working on the button components first.',
            userId: userIds[0],
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
          }
        ] : []
      });
      
      cardIndex++;
    }
    
    console.log(`   ✓ Created ${cardsPerBoard} cards for board ${boardIndex + 1}`);
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🚀 Starting database seeding...\n');
    
    // Check if data already exists
    const existingUsers = await find(USERS_COLLECTION, {});
    if (existingUsers.length > 0) {
      console.log('⚠️  Database already contains data. Skipping seed.');
      console.log('   To re-seed, clear the database first.\n');
      return;
    }
    
    // Seed data in order
    const userIds = await seedUsers();
    const boardIds = await seedBoards(userIds);
    const listIds = await seedLists(boardIds);
    await seedCards(listIds, userIds);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${userIds.length} users created`);
    console.log(`   • ${boardIds.length} boards created`);
    console.log(`   • ${listIds.length} lists created`);
    console.log(`   • ${sampleCards.length} cards created`);
    
    console.log('\n🔐 Test Users:');
    sampleUsers.forEach(user => {
      console.log(`   • ${user.name}: ${user.email} / password123`);
    });
    
    console.log('\n🎯 You can now:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Sign in with any of the test users');
    console.log('   3. Explore the sample boards and cards');
    console.log('   4. Test real-time collaboration with multiple browser tabs\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
