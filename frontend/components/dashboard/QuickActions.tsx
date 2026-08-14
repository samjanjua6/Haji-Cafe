'use client'

import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  AppstoreOutlined, 
  UsergroupAddOutlined, 
  ShopOutlined, 
  MenuOutlined, 
  ShoppingCartOutlined 
} from '@ant-design/icons';
import { User } from '@/types/auth';

interface QuickActionsProps {
  user: User;
}

interface ActionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

export default function QuickActions({ user }: QuickActionsProps) {
  const roleName = user?.role?.name;
  
  // Extracting IDs safely if available
  const userScope = user?.userScopes?.[0];
  const cafeId = userScope?.cafeId;
  const branchId = userScope?.branchId;

  let actions: ActionItem[] = [];

  switch (roleName) {
    case 'SUPER_ADMIN':
      actions = [
        { title: 'Manage Cafes', description: 'View and manage all cafes', icon: <AppstoreOutlined />, href: '/cafes' },
        { title: 'Manage Users', description: 'System user administration', icon: <UsergroupAddOutlined />, href: '/admin/users' },
      ];
      break;
    case 'CAFE_OWNER':
      if (cafeId) {
        actions = [
          { title: 'My Branches', description: 'Manage your cafe branches', icon: <ShopOutlined />, href: `/cafes/${cafeId}` },
          { title: 'Master Menu', description: 'Manage global menu items', icon: <MenuOutlined />, href: `/cafes/${cafeId}/menu` },
          { title: 'View Orders', description: 'See all cafe orders', icon: <ShoppingCartOutlined />, href: `/cafes/${cafeId}?tab=orders` },
        ];
      }
      break;
    case 'BRANCH_MANAGER':
      if (branchId) {
        actions = [
          { title: 'Branch Orders', description: 'Manage current orders', icon: <ShoppingCartOutlined />, href: `/branches/${branchId}/orders` },
          { title: 'Branch Menu', description: 'Manage local menu availability', icon: <MenuOutlined />, href: `/branches/${branchId}/menu` },
        ];
      }
      break;
    case 'STAFF':
      if (branchId) {
        actions = [
          { title: 'Orders', description: 'Process incoming orders', icon: <ShoppingCartOutlined />, href: `/branches/${branchId}/orders` },
        ];
      }
      break;
    default:
      break;
  }

  if (actions.length === 0) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-[#e8e8ed] mb-4">Quick Actions</h2>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {actions.map((action, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Link href={action.href}>
              <div className="bg-[rgba(18,18,26,0.8)] backdrop-blur-md border border-[#2a2a3e] rounded-xl p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)] hover:border-[#f59e0b] group cursor-pointer">
                <div className="flex items-start">
                  <div className="bg-[#1a1a2e] text-[#f59e0b] p-3 rounded-lg text-2xl mr-4 group-hover:bg-[#f59e0b] group-hover:text-[#0a0a0f] transition-colors">
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-[#e8e8ed] group-hover:text-[#f59e0b] transition-colors">{action.title}</h3>
                    <p className="text-[#8b8b9e] text-sm mt-1">{action.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
