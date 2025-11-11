/**
 * Test script for skill extraction service
 * Run with: deno run --allow-all supabase/functions/_shared/test-skill-extraction.ts
 */

import {
  extractSkillsFromOutcomes,
  formatSkillsForDisplay,
  getTopSkills
} from './skill-extraction-service.ts';

// Test data: Real course examples
const testCourses = [
  {
    title: 'Fluid Mechanics',
    level: 'Undergraduate Engineering',
    outcomes: [
      'Apply Bernoulli\'s equation to analyze fluid flow in pipes and channels',
      'Calculate Reynolds number and determine flow regime (laminar vs turbulent)',
      'Design hydraulic systems using principles of fluid statics and dynamics',
      'Use MATLAB to model and simulate fluid flow problems',
      'Analyze heat transfer in fluid systems using convection principles',
      'Conduct laboratory experiments to measure pressure drop and flow rates'
    ]
  },
  {
    title: 'Data Structures and Algorithms',
    level: 'Computer Science',
    outcomes: [
      'Implement fundamental data structures (arrays, linked lists, trees, graphs) in Python',
      'Analyze algorithm complexity using Big-O notation',
      'Design and implement sorting algorithms (quicksort, mergesort, heapsort)',
      'Apply dynamic programming techniques to solve optimization problems',
      'Use hash tables for efficient data retrieval',
      'Implement graph algorithms (Dijkstra, BFS, DFS) for pathfinding problems'
    ]
  },
  {
    title: 'Marketing Strategy',
    level: 'MBA Business',
    outcomes: [
      'Conduct SWOT analysis to evaluate competitive positioning',
      'Develop customer segmentation strategies using market research data',
      'Create financial models to calculate ROI for marketing campaigns',
      'Apply Porter\'s Five Forces framework to industry analysis',
      'Design brand management strategies for consumer products',
      'Use Excel and Tableau to analyze marketing metrics and KPIs'
    ]
  },
  {
    title: 'Machine Learning',
    level: 'Graduate Computer Science',
    outcomes: [
      'Implement supervised learning algorithms (linear regression, logistic regression, SVM)',
      'Apply neural networks and deep learning using TensorFlow and PyTorch',
      'Perform data preprocessing and feature engineering on large datasets',
      'Evaluate model performance using cross-validation and statistical testing',
      'Design recommendation systems using collaborative filtering',
      'Use natural language processing techniques for text classification'
    ]
  }
];

// Run tests
console.log('🧪 Testing Skill Extraction Service\n');
console.log('='.repeat(80));

for (const course of testCourses) {
  console.log(`\n📚 Testing Course: ${course.title}`);
  console.log(`   Level: ${course.level}`);
  console.log(`   Outcomes: ${course.outcomes.length}`);
  console.log('-'.repeat(80));

  const result = await extractSkillsFromOutcomes(
    course.outcomes,
    course.title,
    course.level
  );

  console.log(formatSkillsForDisplay(result));

  console.log('\n   🏆 Top 5 Skills:');
  const topSkills = getTopSkills(result, 5);
  topSkills.forEach((skill, i) => {
    console.log(`     ${i + 1}. ${skill.skill} (${skill.category}, ${skill.confidence.toFixed(2)})`);
  });

  console.log('\n' + '='.repeat(80));
}

console.log('\n✅ All tests complete!');
