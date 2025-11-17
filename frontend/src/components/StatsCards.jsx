import { Card, CardContent } from "@/components/ui/card";
import { Folder, UsersRound, TrendingUp } from "lucide-react";

export default function StatsCards({
  totalSentinelUsers = 0,
  totalAdminUsers = 0,
  newUsersLast7Days = 0,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Total Sentinel Users */}
      <Card className="bg-[#111] border-gray-800 hover:border-gray-700 transition">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Sentinel Users</p>
            <h2 className="text-3xl font-semibold mt-1 text-white">
              {totalSentinelUsers.toLocaleString()}
            </h2>
          </div>
          <Folder className="w-10 h-10 text-blue-400" />
        </CardContent>
      </Card>

      {/* Total Admin Users */}
      <Card className="bg-[#111] border-gray-800 hover:border-gray-700 transition">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Admin Users</p>
            <h2 className="text-3xl font-semibold mt-1 text-white">
              {totalAdminUsers.toLocaleString()}
            </h2>
          </div>
          <UsersRound className="w-10 h-10 text-green-400" />
        </CardContent>
      </Card>

      {/* New Users Last 7 Days */}
      <Card className="bg-[#111] border-gray-800 hover:border-gray-700 transition">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">New Users (Last 7 Days)</p>
            <h2 className="text-3xl font-semibold mt-1 text-white">
              {Number(newUsersLast7Days).toLocaleString()}
            </h2>
          </div>
          <TrendingUp className="w-10 h-10 text-purple-400" />
        </CardContent>
      </Card>
    </div>
  );
}
