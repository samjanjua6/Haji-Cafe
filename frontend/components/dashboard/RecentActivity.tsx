'use client'

import { Card, Timeline, Empty, Spin } from 'antd';
import { motion } from 'framer-motion';
import { useAuditLogs } from '@/lib/hooks/useAuditLogs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface RecentActivityProps {
  cafeId: number | null | undefined;
}

export default function RecentActivity({ cafeId }: RecentActivityProps) {
  const { logs, isLoading } = useAuditLogs(cafeId);

  if (!cafeId) return null;

  return (
    <Card 
      title={<span className="text-[#e8e8ed]">Recent Activity</span>}
      className="bg-[rgba(18,18,26,0.8)] backdrop-blur-md border-[#2a2a3e]"
      headStyle={{ borderBottom: '1px solid #2a2a3e' }}
      bodyStyle={{ padding: '24px' }}
    >
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spin />
        </div>
      ) : logs && logs.length > 0 ? (
        <Timeline
          className="mt-2 text-[#8b8b9e]"
          items={logs.slice(0, 10).map((log, index) => ({
            color: '#f59e0b',
            children: (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="mb-4"
              >
                <div className="flex flex-col">
                  <span className="text-[#e8e8ed] font-medium">{log.action}</span>
                  <span className="text-sm text-[#8b8b9e] line-clamp-2 mt-1">{log.details}</span>
                  <span className="text-xs text-[#8b8b9e] mt-1 opacity-70">
                    {dayjs(log.createdAt).fromNow()}
                  </span>
                </div>
              </motion.div>
            )
          }))}
        />
      ) : (
        <Empty 
          description={<span className="text-[#8b8b9e]">No recent activity</span>} 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      )}
    </Card>
  );
}
