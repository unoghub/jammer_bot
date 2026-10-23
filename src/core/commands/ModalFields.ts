import { LabelBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } from "discord.js";

type TextFieldOptions = {
  maxLength: number;
  required?: boolean;
  style?: TextInputStyle;
};

export function textField(id: string, label: string, options: TextFieldOptions): LabelBuilder {
  return new LabelBuilder().setLabel(label).setTextInputComponent(
    new TextInputBuilder()
      .setCustomId(id)
      .setStyle(options.style ?? TextInputStyle.Short)
      .setMaxLength(options.maxLength)
      .setRequired(options.required ?? true),
  );
}

export function userField(id: string, label: string): LabelBuilder {
  return new LabelBuilder().setLabel(label).setUserSelectMenuComponent(
    new UserSelectMenuBuilder().setCustomId(id).setMinValues(1).setMaxValues(1),
  );
}
