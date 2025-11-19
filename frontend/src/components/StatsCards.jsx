import { Card, CardContent } from "@/components/ui/card";
import { Folder, UsersRound, TrendingUp } from "lucide-react";
import { BorderBeam } from "@/components/lightswind/border-beam";

export default function StatsCards({
  totalSentinelUsers = 0,
  totalAdminUsers = 0,
  newUsersLast7Days = 0,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      {/* Total Sentinel Users */}
      <Card className="relative bg-[#111] rounded-xl border border-white/10 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:border-white/20">
        <BorderBeam
          size={60}
          duration={6}
          delay={0}
          colorFrom="#ff0000"
          colorTo="#ffffff"
          initialOffset={0}
          borderThickness={1}
          opacity={0.4}
          glowIntensity={2}
          beamBorderRadius={0}
        />

        <div className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        <CardContent className="relative p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">Total Sentinel Users</p>
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              {totalSentinelUsers.toLocaleString()}
            </h2>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/20 shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]">
            <Folder className="w-7 h-7 text-blue-300" />
          </div>
        </CardContent>
      </Card>

      {/* Total Admin Users */}
      <Card className="relative bg-[#111] rounded-xl border border-white/10 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:border-white/20">
        <BorderBeam
          size={60}
          duration={6}
          delay={0}
          colorFrom="#ff0000"
          colorTo="#ffffff"
          initialOffset={0}
          borderThickness={1}
          opacity={0.4}
          glowIntensity={2}
          beamBorderRadius={0}
        />
        <div className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        <CardContent className="relative p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">Total Admin Users</p>
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              {totalAdminUsers.toLocaleString()}
            </h2>
          </div>

          <div className="p-3 rounded-lg bg-green-500/10 border border-green-400/20 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]">
            <UsersRound className="w-7 h-7 text-green-300" />
          </div>
        </CardContent>
      </Card>

      {/* New Users Last 7 Days */}
      <Card className="relative bg-[#111] rounded-xl border border-white/10 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:border-white/20">
        <BorderBeam
          size={60}
          duration={6}
          delay={0}
          colorFrom="#ff0000"
          colorTo="#ffffff"
          initialOffset={0}
          borderThickness={1}
          opacity={0.4}
          glowIntensity={2}
          beamBorderRadius={0}
        />
        <div className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        <CardContent className="relative p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">New Users (Last 7 Days)</p>
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              {Number(newUsersLast7Days).toLocaleString()}
            </h2>
          </div>

          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-400/20 shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]">
            <TrendingUp className="w-7 h-7 text-purple-300" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
