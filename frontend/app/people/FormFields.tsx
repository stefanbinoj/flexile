import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { PayRateType, trpc } from "@/trpc/client";
import { useFormContext } from "react-hook-form";
import RadioButtons from "@/components/RadioButtons";
import NumberInput from "@/components/NumberInput";
import { useUserStore } from "@/global";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { skipToken } from "@tanstack/react-query";
import { z } from "zod";

export const schema = z.object({
  payRateType: z.nativeEnum(PayRateType),
  payRateInSubunits: z.number().nullable(),
  role: z.string(),
});

export default function FormFields() {
  const form = useFormContext<z.infer<typeof schema>>();
  const payRateType = form.watch("payRateType");
  const companyId = useUserStore((state) => state.user?.currentCompanyId);
  const { data: workers } = trpc.contractors.list.useQuery(companyId ? { companyId, excludeAlumni: true } : skipToken);

  const uniqueRoles = workers ? [...new Set(workers.map((worker) => worker.role))].sort() : [];
  const roleRegex = new RegExp(form.watch("role"), "iu");

  return (
    <>
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role</FormLabel>
            <Command shouldFilter={false} value={uniqueRoles.find((role) => roleRegex.test(role)) ?? ""}>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Input {...field} type="text" />
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  className="p-0"
                  style={{ width: "var(--radix-popover-trigger-width)" }}
                >
                  <CommandList>
                    <CommandGroup>
                      {uniqueRoles.map((option) => (
                        <CommandItem key={option} value={option} onSelect={(e) => field.onChange(e)}>
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </PopoverContent>
              </Popover>
            </Command>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="payRateType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <FormControl>
              <RadioButtons
                {...field}
                options={[
                  { label: "Hourly", value: PayRateType.Hourly },
                  { label: "Custom", value: PayRateType.Custom },
                ]}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="payRateInSubunits"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rate</FormLabel>
            <FormControl>
              <NumberInput
                value={field.value == null ? null : field.value / 100}
                onChange={(value) => field.onChange(value == null ? null : value * 100)}
                placeholder="0"
                prefix="$"
                suffix={`/ ${payRateType === PayRateType.Custom ? "project" : "hour"}`}
                decimal
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
