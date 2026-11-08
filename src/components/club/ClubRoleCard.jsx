import React from 'react';
import { ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { memberDisplayName } from '@/lib/changeClubRole';

export default function ClubRoleCard({ title, description, members, onAdd, onRemove, isRemoveDisabled, removeDisabledReason }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              {title}
              <Badge variant="secondary" className="ml-1">{members.length}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {onAdd && (
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
              onClick={onAdd}
            >
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-gray-400">No one has this role yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map(member => {
              const disabled = isRemoveDisabled?.(member);
              const removeButton = (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-0 h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                  disabled={disabled}
                  onClick={() => onRemove(member)}
                  aria-label={`Remove role from ${memberDisplayName(member)}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              );

              return (
                <li key={member.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{memberDisplayName(member)}</p>
                    <p className="text-xs text-gray-500 truncate">{member.user_email}</p>
                  </div>
                  {disabled && removeDisabledReason ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>{removeButton}</span>
                      </TooltipTrigger>
                      <TooltipContent>{removeDisabledReason}</TooltipContent>
                    </Tooltip>
                  ) : (
                    removeButton
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}